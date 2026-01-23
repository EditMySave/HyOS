#!/bin/bash
# =============================================================================
# Hytale Server Entrypoint - Minimal Production
# =============================================================================
# Handles: Download, Authentication, Server Launch
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATA_DIR="${DATA_DIR:-/data}"
SERVER_DIR="${DATA_DIR}/server"
SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
ASSETS_FILE="${DATA_DIR}/Assets.zip"
AOT_CACHE="${SERVER_DIR}/HytaleServer.aot"
AUTH_CACHE="${DATA_DIR}/.auth-tokens.json"
VERSION_FILE="${DATA_DIR}/.version"

SERVER_PORT="${SERVER_PORT:-5520}"
JAVA_XMS="${JAVA_XMS:-4G}"
JAVA_XMX="${JAVA_XMX:-8G}"
ENABLE_AOT="${ENABLE_AOT:-true}"
DISABLE_SENTRY="${DISABLE_SENTRY:-false}"
PATCHLINE="${PATCHLINE:-release}"

# OAuth endpoints
OAUTH_URL="https://oauth.accounts.hytale.com"
ACCOUNT_URL="https://account-data.hytale.com"
SESSION_URL="https://sessions.hytale.com"
CLIENT_ID="hytale-server"
SCOPE="openid offline auth:server"

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
log_info()  { echo "[INFO]  $(date '+%H:%M:%S') $*"; }
log_warn()  { echo "[WARN]  $(date '+%H:%M:%S') $*"; }
log_error() { echo "[ERROR] $(date '+%H:%M:%S') $*" >&2; }

# -----------------------------------------------------------------------------
# Server File Management
# -----------------------------------------------------------------------------
download_server_files() {
    log_info "Checking server files..."
    
    if [ -f "$SERVER_JAR" ] && [ -f "$ASSETS_FILE" ]; then
        log_info "Server files already present"
        return 0
    fi
    
    log_info "Downloading server files (patchline: $PATCHLINE)..."
    
    local download_args="-download-path ${DATA_DIR}/game.zip"
    if [ "$PATCHLINE" != "release" ]; then
        download_args="$download_args -patchline $PATCHLINE"
    fi
    
    cd "$DATA_DIR"
    hytale-downloader $download_args
    
    if [ ! -f "${DATA_DIR}/game.zip" ]; then
        log_error "Download failed - game.zip not found"
        exit 1
    fi
    
    log_info "Extracting server files..."
    unzip -q -o "${DATA_DIR}/game.zip" -d "$DATA_DIR"
    rm -f "${DATA_DIR}/game.zip"
    
    # Move Server directory if extracted with capital S
    if [ -d "${DATA_DIR}/Server" ] && [ ! -d "$SERVER_DIR" ]; then
        mv "${DATA_DIR}/Server" "$SERVER_DIR"
    fi
    
    # Verify files
    if [ ! -f "$SERVER_JAR" ]; then
        log_error "HytaleServer.jar not found after extraction"
        exit 1
    fi
    
    if [ ! -f "$ASSETS_FILE" ]; then
        log_error "Assets.zip not found after extraction"
        exit 1
    fi
    
    # Save version info
    hytale-downloader -print-version > "$VERSION_FILE" 2>/dev/null || echo "unknown" > "$VERSION_FILE"
    
    log_info "Server files ready (version: $(cat $VERSION_FILE))"
}

# -----------------------------------------------------------------------------
# OAuth Authentication
# -----------------------------------------------------------------------------
base64url_decode() {
    local b64="$1"
    while (( ${#b64} % 4 != 0 )); do b64+="="; done
    echo "$b64" | tr '_-' '/+' | base64 -d 2>/dev/null
}

is_token_expired() {
    local token="$1"
    if [ -z "$token" ]; then return 0; fi
    
    IFS='.' read -r _ payload _ <<< "$token"
    local payload_json
    payload_json=$(base64url_decode "$payload")
    
    local exp now
    exp=$(echo "$payload_json" | jq -r '.exp // 0')
    now=$(date +%s)
    
    # Check if token expires within 5 minutes
    [ "$((now + 300))" -ge "$exp" ]
}

load_cached_tokens() {
    if [ ! -f "$AUTH_CACHE" ]; then
        return 1
    fi
    
    if ! jq empty "$AUTH_CACHE" 2>/dev/null; then
        log_warn "Invalid auth cache, removing..."
        rm -f "$AUTH_CACHE"
        return 1
    fi
    
    ACCESS_TOKEN=$(jq -r '.access_token // empty' "$AUTH_CACHE")
    REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$AUTH_CACHE")
    PROFILE_UUID=$(jq -r '.profile_uuid // empty' "$AUTH_CACHE")
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ] || [ -z "$PROFILE_UUID" ]; then
        return 1
    fi
    
    log_info "Loaded cached authentication tokens"
    return 0
}

save_auth_tokens() {
    cat > "$AUTH_CACHE" << EOF
{
  "access_token": "$ACCESS_TOKEN",
  "refresh_token": "$REFRESH_TOKEN",
  "profile_uuid": "$PROFILE_UUID",
  "timestamp": $(date +%s)
}
EOF
    chmod 600 "$AUTH_CACHE"
    log_info "Authentication tokens cached"
}

refresh_access_token() {
    if ! is_token_expired "$ACCESS_TOKEN"; then
        return 0
    fi
    
    log_info "Refreshing access token..."
    
    local response
    response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "grant_type=refresh_token" \
        -d "refresh_token=${REFRESH_TOKEN}")
    
    local new_access new_refresh
    new_access=$(echo "$response" | jq -r '.access_token // empty')
    new_refresh=$(echo "$response" | jq -r '.refresh_token // empty')
    
    if [ -z "$new_access" ]; then
        log_warn "Token refresh failed, re-authentication required"
        rm -f "$AUTH_CACHE"
        return 1
    fi
    
    ACCESS_TOKEN="$new_access"
    [ -n "$new_refresh" ] && REFRESH_TOKEN="$new_refresh"
    
    save_auth_tokens
    log_info "Access token refreshed"
}

perform_device_auth() {
    log_info "Starting OAuth Device Code authentication..."
    
    # Step 1: Request device code
    local device_response
    device_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/device/auth" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "scope=${SCOPE}")
    
    local device_code verification_uri interval expires_in
    device_code=$(echo "$device_response" | jq -r '.device_code')
    verification_uri=$(echo "$device_response" | jq -r '.verification_uri_complete')
    interval=$(echo "$device_response" | jq -r '.interval // 5')
    expires_in=$(echo "$device_response" | jq -r '.expires_in // 900')
    
    if [ -z "$device_code" ] || [ "$device_code" = "null" ]; then
        log_error "Failed to get device code"
        exit 1
    fi
    
    # Step 2: Display auth URL
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                    AUTHENTICATION REQUIRED                               ║"
    echo "╠══════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                          ║"
    echo "║  Please visit the following URL to authenticate:                         ║"
    echo "║                                                                          ║"
    echo "║  $verification_uri"
    echo "║                                                                          ║"
    echo "║  Waiting for authentication (expires in ${expires_in}s)...               ║"
    echo "║                                                                          ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Step 3: Poll for token
    local elapsed=0
    ACCESS_TOKEN=""
    
    while [ $elapsed -lt $expires_in ]; do
        sleep "$interval"
        elapsed=$((elapsed + interval))
        
        local token_response
        token_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "client_id=${CLIENT_ID}" \
            -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
            -d "device_code=${device_code}")
        
        local error
        error=$(echo "$token_response" | jq -r '.error // empty')
        
        case "$error" in
            "authorization_pending")
                echo -n "."
                continue
                ;;
            "slow_down")
                interval=$((interval + 1))
                continue
                ;;
            "")
                ACCESS_TOKEN=$(echo "$token_response" | jq -r '.access_token')
                REFRESH_TOKEN=$(echo "$token_response" | jq -r '.refresh_token')
                
                if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
                    echo ""
                    log_info "Authentication successful!"
                    break
                fi
                ;;
            *)
                echo ""
                log_error "Authentication failed: $error"
                exit 1
                ;;
        esac
    done
    
    if [ -z "$ACCESS_TOKEN" ]; then
        log_error "Authentication timed out"
        exit 1
    fi
    
    # Step 4: Get profile UUID
    log_info "Fetching game profile..."
    
    local profiles_response
    profiles_response=$(curl -s -X GET "${ACCOUNT_URL}/my-account/get-profiles" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    PROFILE_UUID=$(echo "$profiles_response" | jq -r '.profiles[0].uuid // empty')
    local profile_name
    profile_name=$(echo "$profiles_response" | jq -r '.profiles[0].username // empty')
    
    if [ -z "$PROFILE_UUID" ]; then
        log_error "No game profiles found"
        exit 1
    fi
    
    log_info "Using profile: $profile_name ($PROFILE_UUID)"
    
    # Save tokens
    save_auth_tokens
}

create_game_session() {
    log_info "Creating game session..."
    
    local session_response
    session_response=$(curl -s -X POST "${SESSION_URL}/game-session/new" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"uuid\": \"${PROFILE_UUID}\"}")
    
    SESSION_TOKEN=$(echo "$session_response" | jq -r '.sessionToken // empty')
    IDENTITY_TOKEN=$(echo "$session_response" | jq -r '.identityToken // empty')
    
    if [ -z "$SESSION_TOKEN" ] || [ "$SESSION_TOKEN" = "null" ]; then
        log_error "Failed to create game session"
        log_error "Response: $session_response"
        exit 1
    fi
    
    log_info "Game session created"
}

authenticate() {
    # Check for pre-injected tokens (hosting provider mode)
    if [ -n "${HYTALE_SERVER_SESSION_TOKEN:-}" ] && [ -n "${HYTALE_SERVER_IDENTITY_TOKEN:-}" ]; then
        log_info "Using pre-injected session tokens"
        SESSION_TOKEN="$HYTALE_SERVER_SESSION_TOKEN"
        IDENTITY_TOKEN="$HYTALE_SERVER_IDENTITY_TOKEN"
        PROFILE_UUID="${HYTALE_OWNER_UUID:-}"
        return 0
    fi
    
    # Try to load cached tokens
    if load_cached_tokens; then
        if refresh_access_token; then
            create_game_session
            return 0
        fi
    fi
    
    # Perform full device authentication
    perform_device_auth
    create_game_session
}

# -----------------------------------------------------------------------------
# Server Launch
# -----------------------------------------------------------------------------
build_java_args() {
    local args=""
    
    # Memory settings
    args="$args -Xms${JAVA_XMS} -Xmx${JAVA_XMX}"
    
    # G1GC with optimized settings
    args="$args -XX:+UseG1GC"
    args="$args -XX:MaxGCPauseMillis=200"
    args="$args -XX:+UseStringDeduplication"
    
    # Container support
    args="$args -XX:+UseContainerSupport"
    
    # AOT cache
    if [ "$ENABLE_AOT" = "true" ] && [ -f "$AOT_CACHE" ]; then
        args="$args -XX:AOTCache=${AOT_CACHE}"
        log_info "AOT cache enabled"
    fi
    
    # Custom JVM options
    if [ -n "${JAVA_OPTS:-}" ]; then
        args="$args $JAVA_OPTS"
    fi
    
    echo "$args"
}

build_server_args() {
    local args=""
    
    # Required arguments
    args="$args --assets ${ASSETS_FILE}"
    args="$args --bind 0.0.0.0:${SERVER_PORT}"
    
    # Authentication tokens
    args="$args --session-token ${SESSION_TOKEN}"
    args="$args --identity-token ${IDENTITY_TOKEN}"
    
    if [ -n "$PROFILE_UUID" ]; then
        args="$args --owner-uuid ${PROFILE_UUID}"
    fi
    
    # Optional flags
    if [ "$DISABLE_SENTRY" = "true" ]; then
        args="$args --disable-sentry"
    fi
    
    if [ "${ENABLE_BACKUP:-false}" = "true" ]; then
        args="$args --backup"
        args="$args --backup-dir ${DATA_DIR}/backups"
        args="$args --backup-frequency ${BACKUP_FREQUENCY:-30}"
    fi
    
    if [ "${ACCEPT_EARLY_PLUGINS:-false}" = "true" ]; then
        args="$args --accept-early-plugins"
    fi
    
    if [ "${ALLOW_OP:-false}" = "true" ]; then
        args="$args --allow-op"
    fi
    
    # Custom server options
    if [ -n "${SERVER_ARGS:-}" ]; then
        args="$args $SERVER_ARGS"
    fi
    
    echo "$args"
}

start_server() {
    local java_args server_args
    java_args=$(build_java_args)
    server_args=$(build_server_args)
    
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Starting Hytale Server"
    log_info "═══════════════════════════════════════════════════════════════"
    log_info "Port: ${SERVER_PORT}/udp"
    log_info "Memory: ${JAVA_XMS} - ${JAVA_XMX}"
    log_info "═══════════════════════════════════════════════════════════════"
    echo ""
    
    cd "$SERVER_DIR"
    
    # Execute server
    exec java $java_args -jar "$SERVER_JAR" $server_args
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    log_info "Hytale Server Container (Minimal) starting..."
    
    # Create directories
    mkdir -p "$SERVER_DIR" "${DATA_DIR}/backups" "${DATA_DIR}/mods"
    
    # Download server files if needed
    download_server_files
    
    # Authenticate
    authenticate
    
    # Start server
    start_server
}

main "$@"
