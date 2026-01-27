#!/bin/bash
# =============================================================================
# Auto-Update Service
# =============================================================================
# Runs in the background, periodically checks for updates, and performs
# automatic updates with graceful server restart.
#
# Usage:
#   /opt/scripts/cmd/auto-update.sh [--once]
#
# Environment Variables:
#   AUTO_UPDATE_INTERVAL  - Check interval in seconds (default: 3600 = 1 hour)
#   AUTO_UPDATE_TIME      - Specific time to check (HH:MM format, optional)
#   AUTO_UPDATE_RESTART   - Restart server after update (default: true)
#   AUTO_UPDATE_BACKUP    - Create backup before update (default: true)
#
# State Updates:
#   Updates /data/.state/version.json with update status
# =============================================================================

set -eo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"

# Auto-update configuration
AUTO_UPDATE_INTERVAL="${AUTO_UPDATE_INTERVAL:-3600}"
AUTO_UPDATE_TIME="${AUTO_UPDATE_TIME:-}"
AUTO_UPDATE_RESTART="${AUTO_UPDATE_RESTART:-true}"
AUTO_UPDATE_BACKUP="${AUTO_UPDATE_BACKUP:-true}"

# Log file for auto-update history
LOG_FILE="${DATA_DIR}/logs/auto-update.log"

# Source libraries
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/download.sh"

# =============================================================================
# Logging (with file output)
# =============================================================================

log_update() {
    local level="$1"
    local message="$2"
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

log_update_info() { log_update "INFO" "$1"; }
log_update_warn() { log_update "WARN" "$1"; }
log_update_error() { log_update "ERROR" "$1"; }

# =============================================================================
# Server Process Management
# =============================================================================

# Check if server is running
is_server_running() {
    pgrep -f "HytaleServer.jar" > /dev/null 2>&1
}

# Get server PID
get_server_pid() {
    pgrep -f "HytaleServer.jar" 2>/dev/null | head -1
}

# Gracefully stop the server
stop_server() {
    log_update_info "Stopping server for update..."
    
    local pid
    pid=$(get_server_pid)
    
    if [[ -z "$pid" ]]; then
        log_update_info "Server not running"
        return 0
    fi
    
    # Send SIGTERM for graceful shutdown
    kill -TERM "$pid" 2>/dev/null || true
    
    # Wait for server to stop (max 60 seconds)
    local timeout=60
    local waited=0
    while is_server_running && [[ $waited -lt $timeout ]]; do
        sleep 2
        ((waited += 2))
        log_update_info "Waiting for server to stop... ($waited/${timeout}s)"
    done
    
    if is_server_running; then
        log_update_warn "Server did not stop gracefully, sending SIGKILL"
        kill -KILL "$pid" 2>/dev/null || true
        sleep 2
    fi
    
    state_set_server "stopped"
    log_update_info "Server stopped"
    return 0
}

# Restart the server by signaling the entrypoint
restart_server() {
    log_update_info "Restarting server..."
    
    # The container's entrypoint handles the server lifecycle
    # We need to restart the container for the server to start again
    # Since we're running inside the container, we can exec the entrypoint
    
    # Update state
    state_set_server "starting"
    
    # Execute the entrypoint again
    exec /bin/bash "${SCRIPTS_DIR}/entrypoint.sh"
}

# =============================================================================
# Update Logic
# =============================================================================

# Check for available updates
check_update() {
    log_update_info "Checking for updates..."
    state_set_update "checking"
    
    local current_version latest_version
    current_version=$(get_current_version)
    latest_version=$(get_latest_version)
    
    log_update_info "Current: $current_version, Latest: $latest_version"
    
    if [[ "$latest_version" == "unknown" ]]; then
        log_update_warn "Could not determine latest version"
        state_set_update "idle" "Could not determine latest version"
        return 1
    fi
    
    if [[ "$current_version" == "$latest_version" ]]; then
        log_update_info "Server is up to date"
        state_set_version "$current_version" "$latest_version"
        state_set_update "idle" "Server is up to date"
        return 1  # No update needed
    fi
    
    log_update_info "Update available: $current_version -> $latest_version"
    state_set_version "$current_version" "$latest_version"
    state_set_update "idle" "Update available: $current_version -> $latest_version"
    return 0  # Update available
}

# Perform the update
do_update() {
    local current_version latest_version
    current_version=$(get_current_version)
    latest_version=$(get_latest_version)
    
    log_update_info "Starting update: $current_version -> $latest_version"
    state_set_update "downloading" "Downloading update: $current_version -> $latest_version"
    
    # Detect existing files
    detect_existing_files
    
    # Stop server if running
    if is_server_running; then
        stop_server
    fi
    
    # Perform update (includes backup if enabled)
    if is_true "$AUTO_UPDATE_BACKUP"; then
        log_update_info "Backup enabled, performing update with backup..."
    fi
    
    state_set_update "updating" "Installing update..."
    
    if perform_update; then
        log_update_info "Update completed successfully!"
        state_set_update "idle" "Update completed: $latest_version"
        
        # Restart if enabled
        if is_true "$AUTO_UPDATE_RESTART"; then
            restart_server
            # Note: restart_server uses exec, so we won't reach here
        else
            log_update_info "Auto-restart disabled. Manual restart required."
        fi
        
        return 0
    else
        log_update_error "Update failed!"
        state_set_update "failed" "Update failed"
        state_set_server "crashed"
        return 1
    fi
}

# =============================================================================
# Scheduled Check
# =============================================================================

# Calculate seconds until next scheduled time
seconds_until_time() {
    local target_time="$1"
    local target_hour target_min now_epoch target_epoch
    
    target_hour="${target_time%%:*}"
    target_min="${target_time##*:}"
    
    now_epoch=$(date +%s)
    target_epoch=$(date -d "today $target_time" +%s 2>/dev/null || date -d "$target_time" +%s)
    
    # If target time has passed today, schedule for tomorrow
    if [[ $target_epoch -le $now_epoch ]]; then
        target_epoch=$((target_epoch + 86400))
    fi
    
    echo $((target_epoch - now_epoch))
}

# =============================================================================
# Main Loop
# =============================================================================

run_once() {
    log_update_info "Running single update check..."
    
    if check_update; then
        do_update
    fi
}

run_loop() {
    log_update_info "Starting auto-update service"
    log_update_info "Interval: ${AUTO_UPDATE_INTERVAL}s"
    [[ -n "$AUTO_UPDATE_TIME" ]] && log_update_info "Scheduled time: $AUTO_UPDATE_TIME"
    
    while true; do
        local sleep_time="$AUTO_UPDATE_INTERVAL"
        
        # If specific time is set, calculate sleep until that time
        if [[ -n "$AUTO_UPDATE_TIME" ]]; then
            sleep_time=$(seconds_until_time "$AUTO_UPDATE_TIME")
            log_update_info "Next check at $AUTO_UPDATE_TIME (in ${sleep_time}s)"
        fi
        
        sleep "$sleep_time"
        
        # Check for updates
        if check_update; then
            do_update
        fi
    done
}

# =============================================================================
# Entry Point
# =============================================================================

main() {
    # Ensure log directory exists
    mkdir -p "$(dirname "$LOG_FILE")"
    
    log_update_info "=========================================="
    log_update_info "Hytale Auto-Update Service"
    log_update_info "=========================================="
    
    # Handle --once flag
    if [[ "${1:-}" == "--once" ]]; then
        run_once
    else
        run_loop
    fi
}

# Handle signals
trap 'log_update_info "Received shutdown signal"; exit 0' SIGTERM SIGINT

main "$@"
