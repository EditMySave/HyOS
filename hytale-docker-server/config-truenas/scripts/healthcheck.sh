#!/bin/bash
# =============================================================================
# Health Check Script
# =============================================================================
# Comprehensive health check for Hytale server
# Supports JSON output for Web UI integration
# Usage: healthcheck.sh [--json]
# =============================================================================

set -e

# Configuration
SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"
SERVER_PORT="${SERVER_PORT:-5520}"
OUTPUT_JSON="${OUTPUT_JSON:-false}"

# Check for JSON flag
[[ "$1" == "--json" ]] && OUTPUT_JSON="true"

# Source utils for JSON helpers (if available)
if [[ -f "${SCRIPTS_DIR}/lib/utils.sh" ]]; then
    source "${SCRIPTS_DIR}/lib/utils.sh"
else
    # Minimal JSON helper if utils not available
    json_object() {
        local json="{"
        local first=true
        while [[ $# -ge 2 ]]; do
            local key="$1" value="$2"
            shift 2
            [[ "$first" != "true" ]] && json+=","
            first=false
            if [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" == "true" ]] || [[ "$value" == "false" ]]; then
                json+="\"$key\":$value"
            else
                json+="\"$key\":\"$value\""
            fi
        done
        json+="}"
        echo "$json"
    }
fi

# Source state.sh for state correction
if [[ -f "${SCRIPTS_DIR}/lib/state.sh" ]]; then
    source "${SCRIPTS_DIR}/lib/state.sh"
fi

# =============================================================================
# Health Checks
# =============================================================================

checks=()
overall_healthy=true
overall_status="healthy"
message=""

# Check 0: Server state file — if starting/authenticating, container is alive and healthy
check_state() {
    local state_file="${DATA_DIR}/.state/server.json"
    if [[ -f "$state_file" ]]; then
        local status
        status=$(jq -r '.status // empty' "$state_file" 2>/dev/null || echo "")
        case "$status" in
            starting)
                checks+=("$(json_object "name" "state" "status" "pass" "message" "Server is starting (may be awaiting authentication)")")
                echo "HEALTHY"
                exit 0
                ;;
            running)
                # Let other checks verify the running state
                return 0
                ;;
            stopped|crashed)
                checks+=("$(json_object "name" "state" "status" "fail" "message" "Server status: $status")")
                overall_healthy=false
                overall_status="unhealthy"
                message="Server status: $status"
                return 1
                ;;
        esac
    fi
    return 0
}

# Check 1: Process running
check_process() {
    if pgrep -f "HytaleServer.jar" > /dev/null 2>&1; then
        local pid
        pid=$(pgrep -f "HytaleServer.jar" | head -1)
        checks+=("$(json_object "name" "process" "status" "pass" "message" "Server process running (PID: $pid)")")
        return 0
    else
        checks+=("$(json_object "name" "process" "status" "fail" "message" "Server process not running")")
        overall_healthy=false
        overall_status="unhealthy"
        message="Server process not running"

        # Safety net: correct stale "running" state to "crashed"
        local state_file="${DATA_DIR}/.state/server.json"
        if [[ -f "$state_file" ]]; then
            local current_status
            current_status=$(jq -r '.status // empty' "$state_file" 2>/dev/null || echo "")
            if [[ "$current_status" == "running" ]] && command -v state_set_server > /dev/null 2>&1; then
                state_set_server "crashed"
            fi
        fi

        return 1
    fi
}

# Check 2: Port binding
check_port() {
    # Try ss first, fall back to netstat
    if command -v ss > /dev/null 2>&1; then
        if ss -ulpn 2>/dev/null | grep -q ":${SERVER_PORT}"; then
            checks+=("$(json_object "name" "port" "status" "pass" "message" "Port ${SERVER_PORT}/udp is bound")")
            return 0
        fi
    elif command -v netstat > /dev/null 2>&1; then
        if netstat -uln 2>/dev/null | grep -q ":${SERVER_PORT}"; then
            checks+=("$(json_object "name" "port" "status" "pass" "message" "Port ${SERVER_PORT}/udp is bound")")
            return 0
        fi
    else
        # Can't check port, assume OK if process is running
        checks+=("$(json_object "name" "port" "status" "skip" "message" "Port check unavailable")")
        return 0
    fi
    
    checks+=("$(json_object "name" "port" "status" "fail" "message" "Port ${SERVER_PORT}/udp not bound")")
    overall_healthy=false
    overall_status="unhealthy"
    [[ -z "$message" ]] && message="Port ${SERVER_PORT}/udp not bound"
    return 1
}

# Check 3: Data directory
check_data() {
    if [[ -d "$DATA_DIR" ]] && [[ -w "$DATA_DIR" ]]; then
        checks+=("$(json_object "name" "data_dir" "status" "pass" "message" "Data directory accessible")")
        return 0
    else
        checks+=("$(json_object "name" "data_dir" "status" "fail" "message" "Data directory not accessible")")
        overall_healthy=false
        overall_status="unhealthy"
        [[ -z "$message" ]] && message="Data directory not accessible"
        return 1
    fi
}

# Check 4: Server JAR exists
check_jar() {
    local jar_path="${DATA_DIR}/server/HytaleServer.jar"
    [[ -f "${DATA_DIR}/Server/HytaleServer.jar" ]] && jar_path="${DATA_DIR}/Server/HytaleServer.jar"
    
    if [[ -f "$jar_path" ]]; then
        checks+=("$(json_object "name" "server_jar" "status" "pass" "message" "Server JAR present")")
        return 0
    else
        checks+=("$(json_object "name" "server_jar" "status" "fail" "message" "Server JAR not found")")
        # Not critical if process is running
        return 0
    fi
}

# Check 5: Memory usage (warning only)
check_memory() {
    if command -v free > /dev/null 2>&1; then
        local mem_percent
        mem_percent=$(free | awk '/Mem:/ {printf "%.0f", $3/$2 * 100}')
        
        if [[ $mem_percent -gt 90 ]]; then
            checks+=("$(json_object "name" "memory" "status" "warn" "message" "High memory usage: ${mem_percent}%")")
        else
            checks+=("$(json_object "name" "memory" "status" "pass" "message" "Memory usage: ${mem_percent}%")")
        fi
    else
        checks+=("$(json_object "name" "memory" "status" "skip" "message" "Memory check unavailable")")
    fi
    return 0
}

# =============================================================================
# Run Checks
# =============================================================================

check_state
check_process
check_port
check_data
check_jar
check_memory

# =============================================================================
# Output Results
# =============================================================================

if [[ "$OUTPUT_JSON" == "true" ]]; then
    # Build checks array
    checks_json="["
    first=true
    for check in "${checks[@]}"; do
        [[ "$first" != "true" ]] && checks_json+=","
        first=false
        checks_json+="$check"
    done
    checks_json+="]"
    
    # Output full JSON
    echo "$(json_object \
        "status" "$overall_status" \
        "healthy" "$overall_healthy" \
        "message" "${message:-OK}" \
        "checks" "$checks_json" \
        "timestamp" "$(date -Iseconds)"
    )"
    
    # Update state file if available
    if [[ -f "${SCRIPTS_DIR}/lib/state.sh" ]]; then
        source "${SCRIPTS_DIR}/lib/state.sh"
        state_set_health "$overall_status" "$message" "$checks_json"
    fi
else
    # Human-readable output
    if [[ "$overall_healthy" == "true" ]]; then
        echo "HEALTHY"
    else
        echo "UNHEALTHY: $message"
    fi
fi

# Exit code
[[ "$overall_healthy" == "true" ]] && exit 0 || exit 1
