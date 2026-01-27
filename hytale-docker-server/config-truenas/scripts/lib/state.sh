#!/bin/bash
# =============================================================================
# State Management
# =============================================================================
# Manages state files for Web UI integration
# All state stored in /data/.state/ as JSON files
# Uses atomic writes (temp + rename) to prevent partial reads
# =============================================================================

# Prevent double-sourcing
[[ -n "${_STATE_LOADED:-}" ]] && return 0
_STATE_LOADED=1

# =============================================================================
# Configuration
# =============================================================================
STATE_DIR="${DATA_DIR:-.}/.state"
STATE_LOCK_DIR="${STATE_DIR}/.locks"

# State file paths
STATE_SERVER="${STATE_DIR}/server.json"
STATE_VERSION="${STATE_DIR}/version.json"
STATE_AUTH="${STATE_DIR}/auth.json"
STATE_CONFIG="${STATE_DIR}/config.json"
STATE_HEALTH="${STATE_DIR}/health.json"

# =============================================================================
# Initialization
# =============================================================================
init_state_dir() {
    mkdir -p "$STATE_DIR" "$STATE_LOCK_DIR" 2>/dev/null || true
    chmod 755 "$STATE_DIR" 2>/dev/null || true
    
    # Initialize default state files if they don't exist
    if [[ ! -f "$STATE_SERVER" ]]; then
        state_set_server "stopped"
    fi
    if [[ ! -f "$STATE_AUTH" ]]; then
        state_set_auth "unknown"
    fi
}

# =============================================================================
# Atomic File Operations
# =============================================================================

# Write JSON to file atomically (temp file + rename)
_atomic_write() {
    local file="$1"
    local content="$2"
    local dir
    dir=$(dirname "$file")
    local tmp_file="${file}.tmp.$$"
    
    # Ensure directory exists
    mkdir -p "$dir" 2>/dev/null || true
    
    echo "$content" > "$tmp_file" && mv -f "$tmp_file" "$file"
}

# Read JSON from file safely
_safe_read() {
    local file="$1"
    if [[ -f "$file" ]]; then
        cat "$file" 2>/dev/null || echo "{}"
    else
        echo "{}"
    fi
}

# =============================================================================
# Server State
# =============================================================================

# Set server status
# Usage: state_set_server "running" [pid]
state_set_server() {
    local status="$1"
    local pid="${2:-}"
    local started_at=""
    local uptime=""
    
    case "$status" in
        running|starting)
            started_at=$(date -Iseconds)
            ;;
        stopped|crashed|unknown)
            pid=""
            ;;
    esac
    
    local json
    json=$(json_object \
        "status" "$status" \
        "pid" "${pid:-null}" \
        "started_at" "${started_at:-null}" \
        "updated_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_SERVER" "$json"
    log_debug "Server state: $status"
}

# Get server status
state_get_server() {
    _safe_read "$STATE_SERVER"
}

# Get specific server field
state_get_server_field() {
    local field="$1"
    jq -r ".$field // empty" "$STATE_SERVER" 2>/dev/null
}

# =============================================================================
# Version State
# =============================================================================

# Set version info
# Usage: state_set_version "current_version" ["latest_version"]
state_set_version() {
    local current="$1"
    local latest="${2:-}"
    local needs_update="false"
    
    if [[ -n "$latest" ]] && [[ "$current" != "$latest" ]]; then
        needs_update="true"
    fi
    
    local json
    json=$(json_object \
        "current" "$current" \
        "latest" "${latest:-null}" \
        "needs_update" "$needs_update" \
        "checked_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_VERSION" "$json"
    log_debug "Version state: current=$current, latest=$latest"
}

# Get version info
state_get_version() {
    _safe_read "$STATE_VERSION"
}

# =============================================================================
# Auth State
# =============================================================================

# Set auth status (no secrets stored here!)
# Usage: state_set_auth "authenticated" ["profile_name"] ["expires_at"] ["auth_url"] ["auth_code"]
state_set_auth() {
    local status="$1"
    local profile="${2:-}"
    local expires_at="${3:-}"
    local auth_url="${4:-}"
    local auth_code="${5:-}"
    
    local authenticated="false"
    [[ "$status" == "authenticated" ]] && authenticated="true"
    
    # Clear auth URL/code if not pending
    if [[ "$status" != "pending" ]]; then
        auth_url=""
        auth_code=""
    fi
    
    local json
    json=$(json_object \
        "status" "$status" \
        "authenticated" "$authenticated" \
        "profile" "${profile:-null}" \
        "expires_at" "${expires_at:-null}" \
        "auth_url" "${auth_url:-null}" \
        "auth_code" "${auth_code:-null}" \
        "updated_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_AUTH" "$json"
    log_debug "Auth state: $status"
}

# Get auth status
state_get_auth() {
    _safe_read "$STATE_AUTH"
}

# =============================================================================
# Config State (Sanitized - no secrets)
# =============================================================================

# Set config state (sanitized copy for Web UI)
# Usage: state_set_config '{"server_name": "...", ...}'
state_set_config() {
    local config_json="$1"
    
    # Wrap with metadata
    local json
    json=$(json_object \
        "config" "$config_json" \
        "updated_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_CONFIG" "$json"
}

# Get config state
state_get_config() {
    _safe_read "$STATE_CONFIG"
}

# =============================================================================
# Health State
# =============================================================================

# Set health status
# Usage: state_set_health "healthy" ["message"]
state_set_health() {
    local status="$1"
    local message="${2:-}"
    local checks="${3:-[]}"
    
    local healthy="false"
    [[ "$status" == "healthy" ]] && healthy="true"
    
    local json
    json=$(json_object \
        "status" "$status" \
        "healthy" "$healthy" \
        "message" "${message:-}" \
        "checks" "$checks" \
        "checked_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_HEALTH" "$json"
}

# Get health status
state_get_health() {
    _safe_read "$STATE_HEALTH"
}

# =============================================================================
# Auto-Update State
# =============================================================================

STATE_UPDATE="${STATE_DIR}/update.json"

# Set auto-update status
# Usage: state_set_update "checking"|"downloading"|"updating"|"idle"|"failed" ["message"]
state_set_update() {
    local status="$1"
    local message="${2:-}"
    local last_check=""
    local next_check=""
    
    # Calculate next check time if interval is set
    if [[ -n "${AUTO_UPDATE_INTERVAL:-}" ]] && [[ "$status" == "idle" ]]; then
        next_check=$(date -d "+${AUTO_UPDATE_INTERVAL} seconds" -Iseconds 2>/dev/null || echo "")
    fi
    
    if [[ "$status" == "checking" ]] || [[ "$status" == "idle" ]]; then
        last_check=$(date -Iseconds)
    fi
    
    local json
    json=$(json_object \
        "status" "$status" \
        "message" "${message:-}" \
        "last_check" "${last_check:-null}" \
        "next_check" "${next_check:-null}" \
        "auto_update_enabled" "$(is_true "${AUTO_UPDATE:-false}" && echo "true" || echo "false")" \
        "updated_at" "$(date -Iseconds)"
    )
    
    _atomic_write "$STATE_UPDATE" "$json"
    log_debug "Update state: $status"
}

# Get auto-update status
state_get_update() {
    _safe_read "$STATE_UPDATE"
}

# =============================================================================
# Combined State (for status command)
# =============================================================================

# Get all state as single JSON object
state_get_all() {
    local server version auth config health update
    server=$(_safe_read "$STATE_SERVER")
    version=$(_safe_read "$STATE_VERSION")
    auth=$(_safe_read "$STATE_AUTH")
    config=$(_safe_read "$STATE_CONFIG")
    health=$(_safe_read "$STATE_HEALTH")
    update=$(_safe_read "$STATE_UPDATE")
    
    json_object \
        "server" "$server" \
        "version" "$version" \
        "auth" "$auth" \
        "config" "$config" \
        "health" "$health" \
        "update" "$update" \
        "timestamp" "$(date -Iseconds)"
}

# =============================================================================
# Cleanup
# =============================================================================

# Remove all state files (for clean restart)
state_cleanup() {
    rm -f "$STATE_SERVER" "$STATE_VERSION" "$STATE_AUTH" "$STATE_CONFIG" "$STATE_HEALTH" "$STATE_UPDATE"
    log_debug "State files cleaned up"
}

# Export functions
export -f init_state_dir
export -f state_set_server state_get_server state_get_server_field
export -f state_set_version state_get_version
export -f state_set_auth state_get_auth
export -f state_set_config state_get_config
export -f state_set_health state_get_health
export -f state_set_update state_get_update
export -f state_get_all state_cleanup
