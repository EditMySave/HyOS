#!/bin/bash
# =============================================================================
# Utility Functions
# =============================================================================

# Colors
if [ "${NO_COLOR:-}" = "true" ]; then
    BOLD=''
    DIM=''
    GREEN=''
    RED=''
    YELLOW=''
    CYAN=''
    NC=''
else
    BOLD='\033[1m'
    DIM='\033[2m'
    GREEN='\033[0;32m'
    RED='\033[0;31m'
    YELLOW='\033[0;33m'
    CYAN='\033[0;36m'
    NC='\033[0m'
fi

# Logging functions
log_info() {
    echo -e "${CYAN}[INFO]${NC} $*"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*" >&2
}

log_debug() {
    if [ "${DEBUG:-false}" = "true" ]; then
        echo -e "${DIM}[DEBUG]${NC} $*"
    fi
}

log_section() {
    echo -e "\n${BOLD}${CYAN}=== $* ===${NC}"
}

log_separator() {
    echo -e "${DIM}═══════════════════════════════════════════════════════════════${NC}"
}

log_step() {
    printf "  %-40s" "$*..."
}

# Boolean check (itzg-style)
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

# Wait for file to exist
wait_for_file() {
    local file="$1"
    local timeout="${2:-60}"
    local elapsed=0
    
    while [ ! -f "$file" ] && [ $elapsed -lt $timeout ]; do
        sleep 1
        ((elapsed++))
    done
    
    [ -f "$file" ]
}

# Export functions
export -f log_info log_warn log_error log_debug log_section log_separator log_step
export -f is_true is_false wait_for_file
