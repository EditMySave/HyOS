#!/bin/bash
# =============================================================================
# Utility Functions
# =============================================================================
# Core utilities for logging, colors, helpers, and JSON output
# Designed for both human-readable and Web UI JSON consumption
# =============================================================================

# Prevent double-sourcing
[[ -n "${_UTILS_LOADED:-}" ]] && return 0
_UTILS_LOADED=1

# =============================================================================
# Output Mode
# =============================================================================
# Set OUTPUT_JSON=true for JSON output (Web UI mode)
OUTPUT_JSON="${OUTPUT_JSON:-false}"

# =============================================================================
# Colors
# =============================================================================
if [[ "${NO_COLOR:-}" == "true" ]] || [[ ! -t 1 ]]; then
    BOLD=''
    DIM=''
    GREEN=''
    RED=''
    YELLOW=''
    CYAN=''
    MAGENTA=''
    NC=''
else
    BOLD='\033[1m'
    DIM='\033[2m'
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[0;33m'
    CYAN='\033[0;36m'
    MAGENTA='\033[0;35m'
    NC='\033[0m'
fi

# =============================================================================
# Logging Functions
# =============================================================================
_timestamp() {
    date '+%H:%M:%S'
}

log_info() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${CYAN}[INFO]${NC}  $(_timestamp) $*"
    fi
}

log_warn() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${YELLOW}[WARN]${NC}  $(_timestamp) $*" >&2
    fi
}

log_error() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${RED}[ERROR]${NC} $(_timestamp) $*" >&2
    fi
}

log_debug() {
    if [[ "${DEBUG:-false}" == "true" ]] && [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${DIM}[DEBUG]${NC} $(_timestamp) $*"
    fi
}

log_success() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${GREEN}[OK]${NC}    $(_timestamp) $*"
    fi
}

# Section header
log_section() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo ""
        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
        echo -e "${BOLD}${CYAN}  $*${NC}"
        echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    fi
}

# Separator line
log_separator() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${DIM}───────────────────────────────────────────────────────────────${NC}"
    fi
}

# Step with status (for progress display)
log_step() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        printf "  %-45s" "$*..."
    fi
}

log_step_done() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${GREEN}done${NC}"
    fi
}

log_step_skip() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${DIM}skipped${NC}"
    fi
}

log_step_fail() {
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${RED}failed${NC}"
    fi
}

log_step_status() {
    local status="$1"
    local color="${2:-$NC}"
    if [[ "$OUTPUT_JSON" != "true" ]]; then
        echo -e "${color}${status}${NC}"
    fi
}

# =============================================================================
# JSON Output Functions (Web UI Integration)
# =============================================================================

# Output JSON object - use for API responses
# Usage: output_json '{"key": "value"}'
output_json() {
    echo "$1"
}

# Build JSON object from key-value pairs
# Usage: json_object "key1" "value1" "key2" "value2"
json_object() {
    local json="{"
    local first=true
    while [[ $# -ge 2 ]]; do
        local key="$1"
        local value="$2"
        shift 2
        
        if [[ "$first" != "true" ]]; then
            json+=","
        fi
        first=false
        
        # Auto-detect type
        if [[ "$value" =~ ^[0-9]+$ ]]; then
            json+="\"$key\":$value"
        elif [[ "$value" == "true" ]] || [[ "$value" == "false" ]] || [[ "$value" == "null" ]]; then
            json+="\"$key\":$value"
        elif [[ "$value" == "{"* ]] || [[ "$value" == "["* ]]; then
            json+="\"$key\":$value"
        else
            # Escape special characters in strings
            value="${value//\\/\\\\}"
            value="${value//\"/\\\"}"
            value="${value//$'\n'/\\n}"
            value="${value//$'\t'/\\t}"
            json+="\"$key\":\"$value\""
        fi
    done
    json+="}"
    echo "$json"
}

# Build JSON array from values
# Usage: json_array "value1" "value2" "value3"
json_array() {
    local json="["
    local first=true
    for value in "$@"; do
        if [[ "$first" != "true" ]]; then
            json+=","
        fi
        first=false
        
        if [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" == "true" ]] || [[ "$value" == "false" ]] || [[ "$value" == "null" ]]; then
            json+="$value"
        elif [[ "$value" == "{"* ]] || [[ "$value" == "["* ]]; then
            json+="$value"
        else
            value="${value//\\/\\\\}"
            value="${value//\"/\\\"}"
            json+="\"$value\""
        fi
    done
    json+="]"
    echo "$json"
}

# =============================================================================
# Boolean Helpers
# =============================================================================

# Check if value is truthy (true, yes, on, 1)
is_true() {
    local value="${1,,}"  # lowercase
    case "$value" in
        true|yes|on|1) return 0 ;;
        *) return 1 ;;
    esac
}

is_false() {
    ! is_true "$1"
}

# =============================================================================
# File & Process Helpers
# =============================================================================

# Wait for file to exist with timeout
wait_for_file() {
    local file="$1"
    local timeout="${2:-60}"
    local elapsed=0
    
    while [[ ! -f "$file" ]] && [[ $elapsed -lt $timeout ]]; do
        sleep 1
        elapsed=$((elapsed + 1))
    done
    
    [[ -f "$file" ]]
}

# Check if process is running
is_process_running() {
    local pattern="$1"
    pgrep -f "$pattern" > /dev/null 2>&1
}

# Get process PID
get_process_pid() {
    local pattern="$1"
    pgrep -f "$pattern" 2>/dev/null | head -1
}

# =============================================================================
# String Helpers
# =============================================================================

# Trim whitespace
trim() {
    local var="$*"
    var="${var#"${var%%[![:space:]]*}"}"
    var="${var%"${var##*[![:space:]]}"}"
    echo -n "$var"
}

# Check if string is empty or whitespace only
is_empty() {
    local trimmed
    trimmed=$(trim "$1")
    [[ -z "$trimmed" ]]
}

# =============================================================================
# Environment Helpers
# =============================================================================

# Get environment variable with default
env_or_default() {
    local var_name="$1"
    local default="$2"
    local value="${!var_name:-$default}"
    echo "$value"
}

# Export functions for subshells
export -f log_info log_warn log_error log_debug log_success
export -f log_section log_separator log_step log_step_done log_step_skip log_step_fail log_step_status
export -f output_json json_object json_array
export -f is_true is_false
export -f wait_for_file is_process_running get_process_pid
export -f trim is_empty env_or_default
