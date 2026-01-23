#!/bin/bash
# =============================================================================
# Authentication Initialization Command
# =============================================================================
# Interactive OAuth authentication setup
# Run this to authenticate before first server start
# Usage: docker run -it --rm -v <volume>:/data <image> /opt/scripts/cmd/auth-init.sh
# =============================================================================

set -eo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"

# Source libraries
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/auth.sh"

# =============================================================================
# Main
# =============================================================================

log_section "Hytale Authentication Setup"

log_info "This will authenticate your Hytale account for server hosting."
log_info "You will need to visit a URL and approve the request."
log_separator

# Initialize directories
mkdir -p "${DATA_DIR}/.auth"
init_state_dir

# Check for existing auth
if load_cached_tokens; then
    log_info "Found existing authentication tokens"
    log_step "Validating tokens"
    
    if refresh_access_token; then
        log_step_done
        log_success "Authentication is valid!"
        log_info "Profile: $PROFILE_NAME ($PROFILE_UUID)"
        
        echo ""
        read -p "Re-authenticate anyway? (y/N): " response
        if [[ "${response,,}" != "y" ]]; then
            exit 0
        fi
    else
        log_step_fail
        log_warn "Existing tokens are invalid, re-authenticating..."
    fi
fi

log_separator

# Perform authentication
if ! perform_device_auth; then
    log_error "Authentication failed"
    exit 1
fi

if ! fetch_profile; then
    log_error "Failed to fetch profile"
    exit 1
fi

save_auth_tokens

log_separator
log_success "Authentication successful!"
log_info "Profile: $PROFILE_NAME"
log_info "UUID: $PROFILE_UUID"
log_separator
log_info "You can now start the server."
