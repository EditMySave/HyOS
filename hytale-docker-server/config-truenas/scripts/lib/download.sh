#!/bin/bash
# =============================================================================
# Server File Management
# =============================================================================
# Downloads, extracts, and manages Hytale server files
# Handles version tracking and update checks
# Updates state files for Web UI integration
# =============================================================================

# Prevent double-sourcing
[[ -n "${_DOWNLOAD_LOADED:-}" ]] && return 0
_DOWNLOAD_LOADED=1

# =============================================================================
# Configuration
# =============================================================================
PATCHLINE="${PATCHLINE:-release}"
VERSION_FILE="${DATA_DIR:-.}/.version"

# =============================================================================
# Path Detection
# =============================================================================

# Detect existing server files and update paths
detect_existing_files() {
    log_debug "Detecting existing server files..."
    
    # Layout 1: /data/Server/HytaleServer.jar (capital S - most common)
    if [[ -f "${DATA_DIR}/Server/HytaleServer.jar" ]]; then
        SERVER_DIR="${DATA_DIR}/Server"
        SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
        log_debug "Found server at: $SERVER_DIR"
    fi
    
    # Layout 2: /data/game/Server/HytaleServer.jar
    if [[ -f "${DATA_DIR}/game/Server/HytaleServer.jar" ]]; then
        SERVER_DIR="${DATA_DIR}/game/Server"
        SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
        ASSETS_FILE="${DATA_DIR}/game/Assets.zip"
        log_debug "Found server at: $SERVER_DIR"
    fi
    
    # Find Assets.zip if not at default location
    if [[ ! -f "$ASSETS_FILE" ]]; then
        local found_assets
        found_assets=$(find "$DATA_DIR" -maxdepth 2 -name "Assets.zip" -type f 2>/dev/null | head -1)
        if [[ -n "$found_assets" ]]; then
            ASSETS_FILE="$found_assets"
            log_debug "Found assets at: $ASSETS_FILE"
        fi
    fi
    
    # Export updated paths
    export SERVER_DIR SERVER_JAR ASSETS_FILE
}

# =============================================================================
# Version Management
# =============================================================================

# Get current installed version
get_current_version() {
    if [[ -f "$VERSION_FILE" ]]; then
        cat "$VERSION_FILE"
    else
        echo "none"
    fi
}

# Get latest available version
get_latest_version() {
    hytale-downloader -print-version 2>/dev/null || echo "unknown"
}

# Check if update is available
check_for_update() {
    local current latest
    current=$(get_current_version)
    latest=$(get_latest_version)
    
    if [[ "$latest" != "unknown" ]] && [[ "$current" != "$latest" ]]; then
        state_set_version "$current" "$latest"
        return 0  # Update available
    fi
    
    state_set_version "$current" "$latest"
    return 1  # No update
}

# =============================================================================
# Download & Extract
# =============================================================================

# Download server files
download_server_files() {
    log_section "Server Files"
    
    # First, detect any existing files
    detect_existing_files
    
    # Check if files already exist
    if [[ -f "$SERVER_JAR" ]] && [[ -f "$ASSETS_FILE" ]]; then
        log_step "Checking existing files"
        log_step_done
        
        local current_version
        current_version=$(get_current_version)
        log_info "Server files present (version: $current_version)"
        
        # Check for updates if enabled
        if is_true "${AUTO_UPDATE:-false}"; then
            log_step "Checking for updates"
            local latest_version
            latest_version=$(get_latest_version)
            
            if [[ "$current_version" != "$latest_version" ]] && [[ "$latest_version" != "unknown" ]]; then
                log_step_status "update available: $latest_version" "$YELLOW"
                # Note: Don't auto-update - let admin decide
            else
                log_step_status "up to date" "$GREEN"
            fi
            
            state_set_version "$current_version" "$latest_version"
        else
            state_set_version "$current_version" ""
        fi
        
        return 0
    fi
    
    # Download required
    log_step "Downloading server files"
    log_step_status "starting..." "$YELLOW"
    
    local download_args="-download-path ${DATA_DIR}/game.zip"
    if [[ "$PATCHLINE" != "release" ]]; then
        download_args="$download_args -patchline $PATCHLINE"
    fi
    
    cd "$DATA_DIR"
    if ! hytale-downloader $download_args; then
        log_error "Download failed"
        return 1
    fi
    
    if [[ ! -f "${DATA_DIR}/game.zip" ]]; then
        log_error "Download failed - game.zip not found"
        return 1
    fi
    
    # Extract
    log_step "Extracting server files"
    unzip -q -o "${DATA_DIR}/game.zip" -d "$DATA_DIR"
    rm -f "${DATA_DIR}/game.zip"
    log_step_done
    
    # Re-detect paths after extraction
    detect_existing_files
    
    # Verify files
    if [[ ! -f "$SERVER_JAR" ]]; then
        log_error "HytaleServer.jar not found after extraction"
        log_error "Expected at: $SERVER_JAR"
        log_debug "Contents of DATA_DIR:"
        find "$DATA_DIR" -type f -name "*.jar" 2>/dev/null || echo "No .jar files found"
        return 1
    fi
    
    if [[ ! -f "$ASSETS_FILE" ]]; then
        log_error "Assets.zip not found after extraction"
        log_error "Expected at: $ASSETS_FILE"
        return 1
    fi
    
    # Save version
    local version
    version=$(get_latest_version)
    echo "$version" > "$VERSION_FILE"
    
    state_set_version "$version" "$version"
    
    log_success "Server files ready (version: $version)"
    return 0
}

# =============================================================================
# Update Functions (for cmd/update.sh)
# =============================================================================

# Perform server update with backup
perform_update() {
    local current_version latest_version
    current_version=$(get_current_version)
    latest_version=$(get_latest_version)
    
    if [[ "$current_version" == "$latest_version" ]]; then
        log_info "Server is already up to date ($current_version)"
        return 0
    fi
    
    log_info "Updating: $current_version -> $latest_version"
    
    # Backup existing files
    if [[ -f "$SERVER_JAR" ]]; then
        log_step "Backing up existing files"
        local backup_dir="${DATA_DIR}/backup-${current_version}-$(date +%Y%m%d%H%M%S)"
        mkdir -p "$backup_dir"
        [[ -d "$SERVER_DIR" ]] && cp -r "$SERVER_DIR" "$backup_dir/"
        [[ -f "$ASSETS_FILE" ]] && cp "$ASSETS_FILE" "$backup_dir/"
        log_step_done
    fi
    
    # Download new version
    log_step "Downloading update"
    log_step_status "starting..." "$YELLOW"
    
    local download_args="-download-path ${DATA_DIR}/game.zip"
    if [[ "$PATCHLINE" != "release" ]]; then
        download_args="$download_args -patchline $PATCHLINE"
    fi
    
    cd "$DATA_DIR"
    if ! hytale-downloader $download_args; then
        log_error "Download failed"
        return 1
    fi
    
    # Extract (overwrite existing)
    log_step "Extracting update"
    unzip -q -o "${DATA_DIR}/game.zip" -d "$DATA_DIR"
    rm -f "${DATA_DIR}/game.zip"
    
    # Handle directory naming
    if [[ -d "${DATA_DIR}/Server" ]]; then
        if [[ -d "$SERVER_DIR" ]] && [[ "$SERVER_DIR" != "${DATA_DIR}/Server" ]]; then
            rm -rf "$SERVER_DIR"
        fi
        SERVER_DIR="${DATA_DIR}/Server"
        SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
    fi
    
    log_step_done
    
    # Verify
    if [[ ! -f "$SERVER_JAR" ]] || [[ ! -f "$ASSETS_FILE" ]]; then
        log_error "Required files not found after extraction"
        return 1
    fi
    
    # Save new version
    echo "$latest_version" > "$VERSION_FILE"
    state_set_version "$latest_version" "$latest_version"
    
    log_success "Update complete (version: $latest_version)"
    return 0
}

# Export functions
export -f detect_existing_files
export -f get_current_version get_latest_version check_for_update
export -f download_server_files perform_update
