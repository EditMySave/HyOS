#!/bin/bash
# =============================================================================
# Schedule Update on Restart
# =============================================================================
# Creates a flag file to trigger update on next container restart
# Usage:
#   docker exec <container> /opt/scripts/cmd/schedule-update.sh [--check|--clear]
#   --check: Check if update is scheduled (exit 0 if yes, 1 if no)
#   --clear: Clear scheduled update flag
#   (no args): Schedule update for next restart
# =============================================================================

set -eo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"

# Source libraries
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/download.sh"

# =============================================================================
# Check Mode
# =============================================================================
if [[ "${1:-}" == "--check" ]]; then
    if state_is_update_scheduled; then
        local scheduled_info
        scheduled_info=$(state_get_update_scheduled)
        local target_version
        target_version=$(echo "$scheduled_info" | jq -r '.target_version // "latest"' 2>/dev/null || echo "latest")
        local scheduled_at
        scheduled_at=$(echo "$scheduled_info" | jq -r '.scheduled_at // "unknown"' 2>/dev/null || echo "unknown")
        
        echo "Update scheduled for next restart"
        echo "Target version: $target_version"
        echo "Scheduled at: $scheduled_at"
        exit 0
    else
        echo "No update scheduled"
        exit 1
    fi
fi

# =============================================================================
# Clear Mode
# =============================================================================
if [[ "${1:-}" == "--clear" ]]; then
    if state_is_update_scheduled; then
        state_clear_update_scheduled
        log_success "Scheduled update cancelled"
        exit 0
    else
        log_info "No scheduled update to cancel"
        exit 0
    fi
fi

# =============================================================================
# Schedule Mode (default)
# =============================================================================

log_section "Schedule Update on Restart"

# Get current version info
detect_existing_files
current_version=$(get_current_version)
log_info "Current version: $current_version"

# Get latest version
log_step "Checking latest version"
latest_version=$(get_latest_version)
log_step_status "$latest_version" "$GREEN"

# Determine target version
target_version="$latest_version"
if [[ "$latest_version" == "unknown" ]] || [[ -z "$latest_version" ]]; then
    target_version=""
    log_warn "Could not determine latest version, will update to latest available on restart"
fi

# Schedule the update
state_set_update_scheduled "$target_version"

log_separator
log_success "Update scheduled for next restart"
if [[ -n "$target_version" ]]; then
    log_info "Target version: $target_version"
fi
log_info "Restart the container to apply the update:"
log_info "  docker restart <container>"
