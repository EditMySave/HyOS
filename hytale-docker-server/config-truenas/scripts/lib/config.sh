#!/bin/bash
# =============================================================================
# Config File Generation
# =============================================================================
# Generates server config.json from environment variables
# Supports full JSON override or individual settings
# Updates state files for Web UI integration
# =============================================================================

# Prevent double-sourcing
[[ -n "${_CONFIG_LOADED:-}" ]] && return 0
_CONFIG_LOADED=1

# =============================================================================
# Config Generation
# =============================================================================

generate_config() {
    local server_dir="${SERVER_DIR:-${DATA_DIR:-/data}/server}"
    local config_file="${server_dir}/config.json"
    
    # Skip if disabled
    if is_true "${SKIP_CONFIG_GENERATION:-false}"; then
        log_info "Skipping config generation (SKIP_CONFIG_GENERATION=true)"
        return 0
    fi
    
    log_section "Configuration"
    
    # Use full JSON override if provided
    if [[ -n "${HYTALE_CONFIG_JSON:-}" ]]; then
        log_step "Writing config from JSON override"
        echo "$HYTALE_CONFIG_JSON" > "$config_file"
        log_step_done
        _update_config_state "$config_file"
        return 0
    fi
    
    # Generate from environment variables
    log_step "Generating config.json"
    
    cat > "$config_file" << EOF
{
  "Version": 3,
  "ServerName": "${SERVER_NAME:-Hytale Server}",
  "MOTD": "${SERVER_MOTD:-}",
  "Password": "${SERVER_PASSWORD:-}",
  "MaxPlayers": ${MAX_PLAYERS:-100},
  "MaxViewRadius": ${MAX_VIEW_RADIUS:-32},
  "LocalCompressionEnabled": ${LOCAL_COMPRESSION:-false},
  "Defaults": {
    "World": "${DEFAULT_WORLD:-default}",
    "GameMode": "${DEFAULT_GAMEMODE:-Adventure}"
  },
  "ConnectionTimeouts": {
    "JoinTimeouts": {}
  },
  "RateLimit": {},
  "Modules": {},
  "LogLevels": {},
  "Mods": {},
  "DisplayTmpTagsInStrings": ${DISPLAY_TMP_TAGS:-false},
  "PlayerStorage": {
    "Type": "${PLAYER_STORAGE_TYPE:-Hytale}"
  }
}
EOF
    
    log_step_done
    
    # Generate whitelist if enabled
    if is_true "${WHITELIST_ENABLED:-false}"; then
        _generate_whitelist "$server_dir"
    fi
    
    # Update state with sanitized config
    _update_config_state "$config_file"
    
    return 0
}

# =============================================================================
# Whitelist Generation
# =============================================================================

_generate_whitelist() {
    local server_dir="$1"
    local whitelist_file="${server_dir}/whitelist.json"
    
    log_step "Generating whitelist.json"
    
    if [[ -n "${WHITELIST_JSON:-}" ]]; then
        # Use full JSON if provided
        echo "$WHITELIST_JSON" > "$whitelist_file"
    elif [[ -n "${WHITELIST_LIST:-}" ]]; then
        # Convert comma-separated list to JSON array
        local whitelist_array
        whitelist_array=$(echo "$WHITELIST_LIST" | tr ',' '\n' | jq -R . | jq -s .)
        cat > "$whitelist_file" << EOF
{
  "enabled": true,
  "players": $whitelist_array
}
EOF
    else
        # Empty whitelist
        cat > "$whitelist_file" << EOF
{
  "enabled": true,
  "players": []
}
EOF
    fi
    
    log_step_done
}

# =============================================================================
# State Updates
# =============================================================================

_update_config_state() {
    local config_file="$1"
    
    # Create sanitized config for state (no passwords)
    local sanitized
    sanitized=$(json_object \
        "server_name" "${SERVER_NAME:-Hytale Server}" \
        "motd" "${SERVER_MOTD:-}" \
        "max_players" "${MAX_PLAYERS:-100}" \
        "max_view_radius" "${MAX_VIEW_RADIUS:-32}" \
        "default_world" "${DEFAULT_WORLD:-default}" \
        "default_gamemode" "${DEFAULT_GAMEMODE:-Adventure}" \
        "whitelist_enabled" "${WHITELIST_ENABLED:-false}" \
        "local_compression" "${LOCAL_COMPRESSION:-false}" \
        "has_password" "$(is_empty "${SERVER_PASSWORD:-}" && echo "false" || echo "true")"
    )
    
    state_set_config "$sanitized"
}

# =============================================================================
# Config Validation
# =============================================================================

validate_config() {
    local server_dir="${SERVER_DIR:-${DATA_DIR:-/data}/server}"
    local config_file="${server_dir}/config.json"
    
    if [[ ! -f "$config_file" ]]; then
        log_warn "Config file not found: $config_file"
        return 1
    fi
    
    if ! jq empty "$config_file" 2>/dev/null; then
        log_error "Invalid JSON in config file"
        return 1
    fi
    
    log_debug "Config validated successfully"
    return 0
}

# =============================================================================
# Config as JSON (for Web UI)
# =============================================================================

get_config_json() {
    local server_dir="${SERVER_DIR:-${DATA_DIR:-/data}/server}"
    local config_file="${server_dir}/config.json"
    
    if [[ -f "$config_file" ]]; then
        # Return sanitized version (remove password)
        jq 'del(.Password)' "$config_file" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

# Export functions
export -f generate_config validate_config get_config_json
