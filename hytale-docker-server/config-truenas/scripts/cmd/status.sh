#!/bin/bash
# =============================================================================
# Server Status Command
# =============================================================================
# Returns comprehensive server status
# Designed for Web UI integration
# Usage: status.sh [--json]
# =============================================================================

set -e

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"
OUTPUT_JSON="${OUTPUT_JSON:-false}"

# Check for JSON flag
[[ "$1" == "--json" ]] && OUTPUT_JSON="true"

# Source libraries
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/download.sh"
source "${SCRIPTS_DIR}/lib/options.sh"

# =============================================================================
# Gather Status Information
# =============================================================================

# Server process
server_running=false
server_pid=""
if pgrep -f "HytaleServer.jar" > /dev/null 2>&1; then
    server_running=true
    server_pid=$(pgrep -f "HytaleServer.jar" | head -1)
fi

# Version info
current_version=$(get_current_version)
latest_version=""
if is_true "${CHECK_UPDATES:-true}"; then
    latest_version=$(get_latest_version 2>/dev/null || echo "")
fi

# Uptime (if running)
uptime_seconds=""
if [[ "$server_running" == "true" ]] && [[ -n "$server_pid" ]]; then
    # Get process start time
    if [[ -f "/proc/$server_pid/stat" ]]; then
        start_time=$(awk '{print $22}' "/proc/$server_pid/stat" 2>/dev/null || echo "")
        if [[ -n "$start_time" ]]; then
            boot_time=$(awk '{print $1}' /proc/stat 2>/dev/null || echo "0")
            clock_ticks=$(getconf CLK_TCK 2>/dev/null || echo "100")
            now=$(date +%s)
            # Approximate uptime
            uptime_seconds=$((now - (boot_time + start_time / clock_ticks)))
        fi
    fi
fi

# Memory usage
memory_used=""
memory_total=""
if command -v free > /dev/null 2>&1; then
    read -r memory_total memory_used <<< $(free -b | awk '/Mem:/ {print $2, $3}')
fi

# Disk usage
disk_used=""
disk_total=""
if command -v df > /dev/null 2>&1; then
    read -r disk_total disk_used <<< $(df -B1 "$DATA_DIR" 2>/dev/null | awk 'NR==2 {print $2, $3}')
fi

# =============================================================================
# Output
# =============================================================================

if [[ "$OUTPUT_JSON" == "true" ]]; then
    # Build server object
    server_json=$(json_object \
        "running" "$server_running" \
        "pid" "${server_pid:-null}" \
        "uptime_seconds" "${uptime_seconds:-null}"
    )
    
    # Build version object
    needs_update="false"
    if [[ -n "$latest_version" ]] && [[ "$current_version" != "$latest_version" ]] && [[ "$current_version" != "none" ]]; then
        needs_update="true"
    fi
    version_json=$(json_object \
        "current" "$current_version" \
        "latest" "${latest_version:-null}" \
        "needs_update" "$needs_update"
    )
    
    # Build resources object
    resources_json=$(json_object \
        "memory_used" "${memory_used:-null}" \
        "memory_total" "${memory_total:-null}" \
        "disk_used" "${disk_used:-null}" \
        "disk_total" "${disk_total:-null}"
    )
    
    # Build config object
    config_json=$(get_options_json)
    
    # Full status
    output_json "$(json_object \
        "server" "$server_json" \
        "version" "$version_json" \
        "resources" "$resources_json" \
        "config" "$config_json" \
        "timestamp" "$(date -Iseconds)"
    )"
else
    # Human-readable output
    echo "=========================================="
    echo "Hytale Server Status"
    echo "=========================================="
    echo ""
    echo "Server:"
    if [[ "$server_running" == "true" ]]; then
        echo "  Status:  RUNNING"
        echo "  PID:     $server_pid"
        [[ -n "$uptime_seconds" ]] && echo "  Uptime:  ${uptime_seconds}s"
    else
        echo "  Status:  STOPPED"
    fi
    echo ""
    echo "Version:"
    echo "  Current: $current_version"
    [[ -n "$latest_version" ]] && echo "  Latest:  $latest_version"
    echo ""
    echo "Configuration:"
    echo "  Port:    ${SERVER_PORT:-5520}/udp"
    echo "  Memory:  ${JAVA_XMS:-1G} - ${JAVA_XMX:-3G}"
    echo ""
fi
