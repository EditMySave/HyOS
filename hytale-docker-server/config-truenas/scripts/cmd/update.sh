#!/bin/bash
# =============================================================================
# Server Update Command
# =============================================================================
# Downloads and installs server updates with backup
# Usage: docker exec <container> /opt/scripts/cmd/update.sh
# Note: Server should be stopped before updating
# =============================================================================

set -eo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"

# Source libraries
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/download.sh"

# =============================================================================
# Pre-flight Checks
# =============================================================================

log_section "Hytale Server Updater"

# Check if server is running
if pgrep -f "HytaleServer.jar" > /dev/null 2>&1; then
    log_error "Server is currently running!"
    log_error "Stop the server before updating:"
    log_error "  docker stop <container>"
    exit 1
fi

# Detect existing files
detect_existing_files

# =============================================================================
# Version Check
# =============================================================================

current_version=$(get_current_version)
log_info "Current version: $current_version"

log_step "Checking latest version"
latest_version=$(get_latest_version)
log_step_status "$latest_version" "$GREEN"

if [[ "$current_version" == "$latest_version" ]]; then
    log_success "Server is already up to date!"
    exit 0
fi

log_info "Update available: $current_version -> $latest_version"
log_separator

# =============================================================================
# Perform Update
# =============================================================================

perform_update

log_separator
log_success "Update complete!"
log_info "Restart the server to use the new version"
