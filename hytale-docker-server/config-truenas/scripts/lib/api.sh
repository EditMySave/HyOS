#!/bin/bash
# =============================================================================
# API Plugin Configuration
# =============================================================================
# Generates config.json for the hytale-api plugin
# Supports bcrypt password hashing via htpasswd (Apache utils)
# =============================================================================

# Hash a password using bcrypt (via htpasswd)
# Uses $2y$ format and converts to $2a$ for Java compatibility
# Usage: api_hash_password "plaintext"
api_hash_password() {
    local password="$1"
    # htpasswd generates $2y$ hashes, sed converts to $2a$ for Java bcrypt compatibility
    htpasswd -bnBC 12 "" "$password" | tr -d ':' | sed 's/\$2y\$/\$2a\$/'
}

# Read API credentials from manager config (if available)
# Returns: sets API_CLIENT_ID and API_CLIENT_SECRET from saved config
api_read_manager_config() {
    local manager_config="$DATA_DIR/.state/manager-config.json"
    
    if [[ -f "$manager_config" ]]; then
        local saved_id saved_secret setup_complete
        saved_id=$(jq -r '.apiClientId // empty' "$manager_config" 2>/dev/null)
        saved_secret=$(jq -r '.apiClientSecret // empty' "$manager_config" 2>/dev/null)
        setup_complete=$(jq -r '.setupComplete // false' "$manager_config" 2>/dev/null)
        
        if [[ "$setup_complete" == "true" ]] && [[ -n "$saved_id" ]] && [[ -n "$saved_secret" ]]; then
            log_info "Using API credentials from Server Manager config"
            export API_CLIENT_ID="$saved_id"
            export API_CLIENT_SECRET="$saved_secret"
            return 0
        fi
    fi
    
    log_debug "No valid manager config found at $manager_config"
    return 1
}

# Generate API config.json
# Uses environment variables for configuration, or reads from manager config
# NOTE: Hytale creates "Server" folder with capital S - must match exactly on Linux (case-sensitive)
api_generate_config() {
    local config_dir="$DATA_DIR/Server/mods/com.hytale_HytaleAPI"
    local config_file="$config_dir/config.json"
    
    # Skip if API is disabled
    if is_false "$API_ENABLED"; then
        log_info "API plugin disabled, skipping config generation"
        return 0
    fi
    
    # Try to read credentials from manager config first
    if [[ -z "$API_CLIENT_SECRET" ]]; then
        api_read_manager_config || true
    fi
    
    # Skip if still no secret is provided
    if [[ -z "$API_CLIENT_SECRET" ]]; then
        log_warn "API_CLIENT_SECRET not set and no manager config found"
        log_warn "Configure API credentials in the Server Manager UI"
        return 0
    fi
    
    # Create config directory
    mkdir -p "$config_dir"
    
    # Check if config already exists
    if [[ -f "$config_file" ]] && is_false "${API_REGENERATE_CONFIG:-false}"; then
        log_debug "API config exists, skipping generation (set API_REGENERATE_CONFIG=true to overwrite)"
        return 0
    fi
    
    log_info "Generating API plugin configuration..."
    
    # Hash the password
    local hashed_secret
    hashed_secret=$(api_hash_password "$API_CLIENT_SECRET")
    
    if [[ -z "$hashed_secret" ]]; then
        log_error "Failed to hash API client secret"
        return 1
    fi
    
    # Generate config JSON
    cat > "$config_file" <<EOF
{
  "enabled": ${API_ENABLED:-true},
  "port": ${API_PORT:-8080},
  "bindAddress": "${API_BIND_ADDRESS:-0.0.0.0}",
  "tls": {
    "enabled": ${API_TLS_ENABLED:-false},
    "certPath": "${API_TLS_CERT_PATH:-cert.pem}",
    "keyPath": "${API_TLS_KEY_PATH:-key.pem}",
    "keyPassword": null
  },
  "jwt": {
    "issuer": "${API_JWT_ISSUER:-hytale-api}",
    "audience": "${API_JWT_AUDIENCE:-hytale-server}",
    "tokenValiditySeconds": ${API_JWT_TOKEN_VALIDITY:-3600},
    "refreshTokenValiditySeconds": ${API_JWT_REFRESH_VALIDITY:-86400},
    "rsaKeyPath": "jwt-keypair.pem",
    "algorithm": "RS256"
  },
  "clients": [
    {
      "id": "${API_CLIENT_ID:-hyos-manager}",
      "secret": "${hashed_secret}",
      "description": "HyOS Server Manager client",
      "permissions": ["api.*"],
      "enabled": true
    }
  ],
  "rateLimits": {
    "defaultRequestsPerMinute": ${API_RATE_LIMIT:-300},
    "burstSize": ${API_RATE_BURST:-50},
    "endpoints": {
      "/auth/token": {
        "requestsPerMinute": ${API_RATE_LIMIT_AUTH:-60},
        "burstSize": ${API_RATE_BURST_AUTH:-10}
      },
      "/admin/*": {
        "requestsPerMinute": ${API_RATE_LIMIT_ADMIN:-120},
        "burstSize": ${API_RATE_BURST_ADMIN:-20}
      }
    }
  },
  "cors": {
    "allowedOrigins": ["*"],
    "allowedMethods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allowedHeaders": ["Authorization", "Content-Type", "X-Request-ID"],
    "exposedHeaders": ["X-Request-ID", "X-RateLimit-Remaining"],
    "allowCredentials": true,
    "maxAge": 86400
  },
  "websocket": {
    "enabled": ${API_WEBSOCKET_ENABLED:-true},
    "path": "/ws",
    "maxConnections": ${API_WEBSOCKET_MAX_CONNECTIONS:-100},
    "pingIntervalSeconds": 30,
    "statusBroadcastIntervalSeconds": ${API_WEBSOCKET_STATUS_INTERVAL:-5}
  },
  "audit": {
    "enabled": ${API_AUDIT_ENABLED:-true},
    "logRequests": ${API_AUDIT_LOG_REQUESTS:-true},
    "logResponses": false,
    "logAdminActions": true,
    "sensitiveFields": ["secret", "password", "token", "authorization"]
  }
}
EOF
    
    # Set permissions
    chown hytale:hytale "$config_file"
    chmod 600 "$config_file"
    
    log_info "API config generated at $config_file"
    log_debug "API client ID: ${API_CLIENT_ID:-hyos-manager}"
    
    return 0
}

# Copy plugin JARs to mods directory
api_install_plugins() {
    local plugins_src="/opt/plugins"
    local mods_dir="$DATA_DIR/mods"
    
    # Skip if no plugins directory
    if [[ ! -d "$plugins_src" ]] || [[ -z "$(ls -A "$plugins_src" 2>/dev/null)" ]]; then
        log_debug "No plugins to install from $plugins_src"
        return 0
    fi
    
    mkdir -p "$mods_dir"
    
    log_info "Installing plugins..."
    
    local count=0
    for jar in "$plugins_src"/*.jar; do
        if [[ -f "$jar" ]]; then
            local name=$(basename "$jar")
            cp "$jar" "$mods_dir/$name"
            chown hytale:hytale "$mods_dir/$name"
            log_debug "Installed plugin: $name"
            ((count++))
        fi
    done
    
    if [[ $count -gt 0 ]]; then
        log_info "Installed $count plugin(s)"
    fi
    
    return 0
}
