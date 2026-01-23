#!/bin/bash
# =============================================================================
# Hytale Server Entrypoint - Enterprise Configuration
# =============================================================================
# Full-featured entrypoint with all server options and hosting provider support
# =============================================================================

set -euo pipefail

# -----------------------------------------------------------------------------
# Configuration
# -----------------------------------------------------------------------------
DATA_DIR="${DATA_DIR:-/data}"
SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
SERVER_DIR="${DATA_DIR}/server"
SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
ASSETS_FILE="${DATA_DIR}/Assets.zip"
AOT_CACHE="${SERVER_DIR}/HytaleServer.aot"
AUTH_CACHE="${DATA_DIR}/.auth"
TOKENS_FILE="${AUTH_CACHE}/tokens.json"

# Source utilities
source "${SCRIPTS_DIR}/utils.sh"
source "${SCRIPTS_DIR}/auth.sh"
source "${SCRIPTS_DIR}/options.sh"

# -----------------------------------------------------------------------------
# User Setup
# -----------------------------------------------------------------------------
setup_user() {
    local target_uid="${UID:-1000}"
    local target_gid="${GID:-1000}"
    
    # Only run user setup if we're root
    if [ "$(id -u)" != "0" ]; then
        return 0
    fi
    
    log_info "Setting up user (UID: $target_uid, GID: $target_gid)"
    
    # Update user/group IDs if needed
    if [ "$target_uid" != "$(id -u hytale)" ]; then
        usermod -u "$target_uid" hytale
    fi
    
    if [ "$target_gid" != "$(id -g hytale)" ]; then
        groupmod -o -g "$target_gid" hytale
    fi
    
    # Fix ownership
    chown -R hytale:hytale "$DATA_DIR"
    
    # Re-execute as hytale user
    exec gosu hytale:hytale "$0" "$@"
}

# -----------------------------------------------------------------------------
# Server File Management
# -----------------------------------------------------------------------------
download_server_files() {
    log_section "Server Files"
    
    if [ -f "$SERVER_JAR" ] && [ -f "$ASSETS_FILE" ]; then
        log_step "Checking files"
        printf "%spresent%s\n" "${GREEN}" "${NC}"
        
        if [ "${AUTO_UPDATE:-false}" = "true" ]; then
            log_step "Checking updates"
            local current_version latest_version
            current_version=$(cat "${DATA_DIR}/.version" 2>/dev/null || echo "unknown")
            latest_version=$(hytale-downloader -print-version 2>/dev/null || echo "unknown")
            
            if [ "$current_version" != "$latest_version" ]; then
                printf "%supdate available: %s%s\n" "${YELLOW}" "$latest_version" "${NC}"
                # Don't auto-update in enterprise - let admin decide
            else
                printf "%sup to date%s\n" "${GREEN}" "${NC}"
            fi
        fi
        return 0
    fi
    
    log_step "Downloading files"
    
    local download_args="-download-path ${DATA_DIR}/game.zip"
    if [ "${PATCHLINE:-release}" != "release" ]; then
        download_args="$download_args -patchline ${PATCHLINE}"
    fi
    
    printf "%sstarting...%s\n" "${YELLOW}" "${NC}"
    
    cd "$DATA_DIR"
    if ! hytale-downloader $download_args; then
        log_error "Download failed"
        exit 1
    fi
    
    log_step "Extracting files"
    unzip -q -o "${DATA_DIR}/game.zip" -d "$DATA_DIR"
    rm -f "${DATA_DIR}/game.zip"
    
    # Handle directory naming
    if [ -d "${DATA_DIR}/Server" ] && [ ! -d "$SERVER_DIR" ]; then
        mv "${DATA_DIR}/Server" "$SERVER_DIR"
    fi
    
    # Verify
    if [ ! -f "$SERVER_JAR" ] || [ ! -f "$ASSETS_FILE" ]; then
        log_error "Required files not found after extraction"
        exit 1
    fi
    
    # Save version
    hytale-downloader -print-version > "${DATA_DIR}/.version" 2>/dev/null || echo "unknown" > "${DATA_DIR}/.version"
    
    printf "%sdone%s\n" "${GREEN}" "${NC}"
}

# -----------------------------------------------------------------------------
# Configuration File Generation
# -----------------------------------------------------------------------------
generate_config() {
    if [ "${SKIP_CONFIG_GENERATION:-false}" = "true" ]; then
        log_info "Skipping config generation (SKIP_CONFIG_GENERATION=true)"
        return 0
    fi
    
    log_section "Configuration"
    
    local config_file="${SERVER_DIR}/config.json"
    
    # Use full JSON override if provided
    if [ -n "${HYTALE_CONFIG_JSON:-}" ]; then
        log_step "Config from JSON"
        echo "$HYTALE_CONFIG_JSON" > "$config_file"
        printf "%swritten%s\n" "${GREEN}" "${NC}"
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
    
    printf "%sgenerated%s\n" "${GREEN}" "${NC}"
    
    # Generate whitelist if enabled
    if [ "${WHITELIST_ENABLED:-false}" = "true" ]; then
        log_step "Generating whitelist.json"
        
        if [ -n "${WHITELIST_JSON:-}" ]; then
            echo "$WHITELIST_JSON" > "${SERVER_DIR}/whitelist.json"
        elif [ -n "${WHITELIST_LIST:-}" ]; then
            # Convert comma-separated list to JSON array
            local whitelist_array
            whitelist_array=$(echo "$WHITELIST_LIST" | tr ',' '\n' | jq -R . | jq -s .)
            echo "{\"enabled\": true, \"players\": $whitelist_array}" > "${SERVER_DIR}/whitelist.json"
        fi
        
        printf "%sgenerated%s\n" "${GREEN}" "${NC}"
    fi
}

# -----------------------------------------------------------------------------
# Server Launch
# -----------------------------------------------------------------------------
build_java_args() {
    local args=""
    
    # Memory settings
    args="$args -Xms${JAVA_XMS:-4G} -Xmx${JAVA_XMX:-8G}"
    
    # Container support
    args="$args -XX:+UseContainerSupport"
    
    # Garbage collector
    if [ "${USE_ZGC:-false}" = "true" ]; then
        args="$args -XX:+UseZGC"
        args="$args -XX:ZCollectionInterval=${ZGC_INTERVAL:-5}"
    else
        args="$args -XX:+UseG1GC"
        args="$args -XX:MaxGCPauseMillis=${G1_MAX_PAUSE:-200}"
        [ -n "${G1_NEW_SIZE_PERCENT:-}" ] && args="$args -XX:G1NewSizePercent=${G1_NEW_SIZE_PERCENT}"
        [ -n "${G1_MAX_NEW_SIZE_PERCENT:-}" ] && args="$args -XX:G1MaxNewSizePercent=${G1_MAX_NEW_SIZE_PERCENT}"
        [ -n "${G1_HEAP_REGION_SIZE:-}" ] && args="$args -XX:G1HeapRegionSize=${G1_HEAP_REGION_SIZE}"
    fi
    
    # Performance flags
    args="$args -XX:+UseStringDeduplication"
    args="$args -XX:+AlwaysPreTouch"
    args="$args -XX:+ParallelRefProcEnabled"
    
    # AOT cache
    if [ "${ENABLE_AOT:-true}" = "true" ] && [ -f "$AOT_CACHE" ]; then
        args="$args -XX:AOTCache=${AOT_CACHE}"
    fi
    
    # Custom JVM options
    [ -n "${JAVA_OPTS:-}" ] && args="$args $JAVA_OPTS"
    [ -n "${JVM_XX_OPTS:-}" ] && args="$args $JVM_XX_OPTS"
    
    echo "$args"
}

build_server_args() {
    local args=""
    
    # Required arguments
    args="$args --assets ${ASSETS_FILE}"
    args="$args --bind 0.0.0.0:${SERVER_PORT:-5520}"
    
    # Authentication tokens
    if [ -n "${SESSION_TOKEN:-}" ]; then
        args="$args --session-token ${SESSION_TOKEN}"
    fi
    
    if [ -n "${IDENTITY_TOKEN:-}" ]; then
        args="$args --identity-token ${IDENTITY_TOKEN}"
    fi
    
    if [ -n "${OWNER_UUID:-}" ]; then
        args="$args --owner-uuid ${OWNER_UUID}"
    fi
    
    # Build all server options from environment
    args="$args $(build_hytale_options)"
    
    echo "$args"
}

start_server() {
    log_section "Server Startup"
    
    local java_args server_args
    java_args=$(build_java_args)
    server_args=$(build_server_args)
    
    log_info "Port: ${SERVER_PORT:-5520}/udp"
    log_info "Memory: ${JAVA_XMS:-4G} - ${JAVA_XMX:-8G}"
    log_info "GC: $([ "${USE_ZGC:-false}" = "true" ] && echo "ZGC" || echo "G1GC")"
    log_info "AOT: $([ "${ENABLE_AOT:-true}" = "true" ] && [ -f "$AOT_CACHE" ] && echo "enabled" || echo "disabled")"
    
    log_separator
    
    cd "$SERVER_DIR"
    
    # Execute server
    exec java $java_args -jar "$SERVER_JAR" $server_args
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
main() {
    log_separator
    log_info "Hytale Server (Enterprise) starting..."
    log_info "Version: $(cat /etc/image.properties 2>/dev/null | grep version | cut -d= -f2 || echo 'dev')"
    log_separator
    
    # Handle user setup (if running as root)
    setup_user "$@"
    
    # Create directories
    mkdir -p "$SERVER_DIR" "$AUTH_CACHE" "${DATA_DIR}/backups" "${DATA_DIR}/mods" "${DATA_DIR}/logs"
    
    # Download server files
    download_server_files
    
    # Generate configuration
    generate_config
    
    # Authenticate
    authenticate
    
    # Start server
    start_server
}

main "$@"
