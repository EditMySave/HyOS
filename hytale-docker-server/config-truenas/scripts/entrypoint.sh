#!/bin/bash
# =============================================================================
# Hytale Server Entrypoint - TrueNAS SCALE
# =============================================================================
# Modular entrypoint with Web UI-ready architecture
# Sources library scripts for clean separation of concerns
# =============================================================================

# Unbuffered output for immediate logging (TrueNAS compatibility)
exec 1> >(stdbuf -oL cat 2>/dev/null || cat) 2>&1
export PYTHONUNBUFFERED=1

# =============================================================================
# Early Diagnostics (before anything else)
# =============================================================================
echo "=========================================="
echo "Hytale Server Container Starting..."
echo "=========================================="
echo "Date: $(date)"
echo "User: $(id)"
echo "Architecture: $(uname -m)"
echo "Working directory: $(pwd)"
echo "=========================================="

# =============================================================================
# Configuration
# =============================================================================
export SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
export DATA_DIR="${DATA_DIR:-/data}"
export SERVER_DIR="${DATA_DIR}/server"
export SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
export ASSETS_FILE="${DATA_DIR}/Assets.zip"

# TrueNAS defaults
export PUID="${PUID:-568}"
export PGID="${PGID:-568}"
export UMASK="${UMASK:-002}"

# Server defaults
export SERVER_PORT="${SERVER_PORT:-5520}"
export JAVA_XMS="${JAVA_XMS:-4G}"
export JAVA_XMX="${JAVA_XMX:-8G}"
export ENABLE_AOT="${ENABLE_AOT:-true}"
export PATCHLINE="${PATCHLINE:-release}"

# Auto-update defaults
export AUTO_UPDATE="${AUTO_UPDATE:-false}"
export AUTO_UPDATE_INTERVAL="${AUTO_UPDATE_INTERVAL:-3600}"
export AUTO_UPDATE_TIME="${AUTO_UPDATE_TIME:-}"
export AUTO_UPDATE_RESTART="${AUTO_UPDATE_RESTART:-true}"
export AUTO_UPDATE_BACKUP="${AUTO_UPDATE_BACKUP:-true}"

# =============================================================================
# Source Library Scripts
# =============================================================================
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/auth.sh"
source "${SCRIPTS_DIR}/lib/options.sh"
source "${SCRIPTS_DIR}/lib/config.sh"
source "${SCRIPTS_DIR}/lib/download.sh"
source "${SCRIPTS_DIR}/lib/api.sh"

# Now enable strict mode (after sourcing)
set -eo pipefail

# =============================================================================
# Architecture Check
# =============================================================================
# check_architecture() {
#     local arch
#     arch=$(uname -m)
    
#     if [[ "$arch" != "x86_64" ]] && [[ "$arch" != "amd64" ]]; then
#         log_error "This container only supports x86_64/amd64 architecture"
#         log_error "Your system is: $arch"
#         log_error "The Hytale downloader binary is x86_64 only"
#         exit 1
#     fi
    
#     log_debug "Architecture OK: $arch"
# }

# =============================================================================
# Permission Check
# =============================================================================
check_permissions() {
    log_debug "Checking DATA_DIR permissions..."
    
    if [[ ! -d "$DATA_DIR" ]]; then
        log_error "DATA_DIR does not exist: $DATA_DIR"
        exit 1
    fi
    
    if ! touch "$DATA_DIR/.write-test" 2>/dev/null; then
        log_error "Cannot write to DATA_DIR: $DATA_DIR"
        log_error "Container user $(id) lacks write permissions"
        log_error "Fix: Set dataset owner to match container user"
        exit 1
    fi
    rm -f "$DATA_DIR/.write-test"
    
    log_debug "Permissions OK"
}

# =============================================================================
# User Setup (if running as root)
# =============================================================================
setup_user() {
    # Skip if not running as root
    if [[ "$(id -u)" != "0" ]]; then
        log_debug "Not running as root, skipping user setup"
        return 0
    fi
    
    log_info "Setting up user (PUID=$PUID, PGID=$PGID)"
    
    # Modify existing user/group to match PUID/PGID
    if [[ "$(id -u hytale 2>/dev/null)" != "$PUID" ]]; then
        usermod -u "$PUID" hytale 2>/dev/null || true
    fi
    
    if [[ "$(getent group hytale | cut -d: -f3)" != "$PGID" ]]; then
        groupmod -g "$PGID" hytale 2>/dev/null || true
    fi
    
    # Set umask
    umask "$UMASK"
    
    # Fix ownership
    chown -R hytale:hytale "$DATA_DIR" 2>/dev/null || log_warn "Could not change ownership of $DATA_DIR"
    
    log_debug "User setup complete"
}

# =============================================================================
# Directory Setup
# =============================================================================
setup_directories() {
    log_debug "Creating directories..."
    
    mkdir -p \
        "$SERVER_DIR" \
        "${DATA_DIR}/backups" \
        "${DATA_DIR}/mods" \
        "${DATA_DIR}/universe" \
        "${DATA_DIR}/logs" \
        "${DATA_DIR}/.auth" \
        2>/dev/null || true
    
    # Initialize state directory
    init_state_dir
}

# =============================================================================
# Server Launch
# =============================================================================
start_server() {
    log_section "Server Startup"
    
    # Build arguments
    local java_args server_args
    java_args=$(build_java_args)
    server_args=$(build_server_args)
    
    # Log startup info
    log_info "Port: ${SERVER_PORT}/udp"
    log_info "Memory: ${JAVA_XMS} - ${JAVA_XMX}"
    log_info "GC: $(is_true "${USE_ZGC:-false}" && echo "ZGC" || echo "G1GC")"
    log_info "AOT: $(is_true "$ENABLE_AOT" && [[ -f "${SERVER_DIR}/HytaleServer.aot" ]] && echo "enabled" || echo "disabled")"
    log_info "User: $(id)"
    
    log_separator
    
    # Update state
    state_set_server "starting"
    
    cd "$SERVER_DIR"
    
    # Execute server
    log_info "Starting Java process..."
    state_set_server "running" "$$"
    
    exec java $java_args -jar "$SERVER_JAR" $server_args
}

# =============================================================================
# Main
# =============================================================================
main() {
    log_section "Hytale Server (TrueNAS)"
    log_info "Version: Enterprise-Modular"
    
    # Pre-flight checks
    # check_architecture
    check_permissions
    
    # Setup
    setup_user
    setup_directories
    
    # Initialize state (after directories are created)
    state_set_server "starting"
    
    # Check for scheduled update flag
    local was_scheduled=false
    if state_is_update_scheduled; then
        log_info "Scheduled update detected - will update on this restart"
        local scheduled_info
        scheduled_info=$(state_get_update_scheduled)
        local target_version
        target_version=$(echo "$scheduled_info" | jq -r '.target_version // empty' 2>/dev/null || echo "")
        if [[ -n "$target_version" ]] && [[ "$target_version" != "null" ]]; then
            log_info "Target version: $target_version"
        fi
        
        # Temporarily enable AUTO_UPDATE for this restart
        export AUTO_UPDATE="true"
        was_scheduled=true
        
        # Clear the flag (will be re-created if update fails)
        state_clear_update_scheduled
    fi
    
    # Download server files
    download_server_files || {
        state_set_server "crashed"
        exit 1
    }
    
    # If scheduled update was applied, log success
    if [[ "$was_scheduled" == "true" ]]; then
        log_success "Scheduled update completed successfully"
    fi
    
    # Install plugins (from /opt/plugins)
    api_install_plugins || {
        log_warn "Plugin installation failed, continuing without plugins"
    }
    
    # Generate server configuration
    generate_config || {
        log_warn "Config generation failed, continuing with defaults"
    }
    
    # Generate API plugin configuration
    api_generate_config || {
        log_warn "API config generation failed, continuing without API"
    }
    
    # Authenticate
    authenticate || {
        state_set_server "crashed"
        exit 1
    }
    
    # Start server
    # If running as root, drop privileges first
    if [[ "$(id -u)" == "0" ]]; then
        log_info "Dropping privileges to hytale user..."
        
        # Build args while still root (has access to all vars)
        local java_args server_args
        java_args=$(build_java_args)
        server_args=$(build_server_args)
        
        cd "$SERVER_DIR"
        state_set_server "running" "$$"
        
        exec su-exec hytale:hytale java $java_args -jar "$SERVER_JAR" $server_args
    else
        start_server
    fi
}

# =============================================================================
# Signal Handling
# =============================================================================
cleanup() {
    log_info "Received shutdown signal"
    state_set_server "stopped"
    exit 0
}

trap cleanup SIGTERM SIGINT

# =============================================================================
# Entry Point
# =============================================================================
main "$@"
