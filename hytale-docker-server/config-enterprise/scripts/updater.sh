#!/bin/bash
# =============================================================================
# Server Update Script
# =============================================================================
# Downloads/updates server files without starting the server
# Usage: docker compose run --rm updater
# =============================================================================

set -euo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"
SERVER_DIR="${DATA_DIR}/server"
SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
ASSETS_FILE="${DATA_DIR}/Assets.zip"
PATCHLINE="${PATCHLINE:-release}"

# Source utilities
source "${SCRIPTS_DIR}/utils.sh"

log_separator
log_info "Hytale Server Updater"
log_separator

# Check current version
current_version="none"
if [ -f "${DATA_DIR}/.version" ]; then
    current_version=$(cat "${DATA_DIR}/.version")
fi

log_info "Current version: $current_version"

# Check latest version
log_step "Checking latest version"
latest_version=$(hytale-downloader -print-version 2>/dev/null || echo "unknown")
printf "%s%s%s\n" "${GREEN}" "$latest_version" "${NC}"

if [ "$current_version" = "$latest_version" ]; then
    log_info "Server is up to date!"
    exit 0
fi

log_info "Update available: $current_version -> $latest_version"

# Download
log_step "Downloading server files"

download_args="-download-path ${DATA_DIR}/game.zip"
if [ "$PATCHLINE" != "release" ]; then
    download_args="$download_args -patchline $PATCHLINE"
fi

printf "%sstarting...%s\n" "${YELLOW}" "${NC}"

cd "$DATA_DIR"
if ! hytale-downloader $download_args; then
    log_error "Download failed"
    exit 1
fi

# Backup existing files
if [ -f "$SERVER_JAR" ]; then
    log_step "Backing up existing files"
    backup_dir="${DATA_DIR}/backup-${current_version}-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$backup_dir"
    [ -d "$SERVER_DIR" ] && cp -r "$SERVER_DIR" "$backup_dir/"
    [ -f "$ASSETS_FILE" ] && cp "$ASSETS_FILE" "$backup_dir/"
    printf "%sdone%s\n" "${GREEN}" "${NC}"
fi

# Extract
log_step "Extracting files"
unzip -q -o "${DATA_DIR}/game.zip" -d "$DATA_DIR"
rm -f "${DATA_DIR}/game.zip"

# Handle directory naming
if [ -d "${DATA_DIR}/Server" ] && [ ! -d "$SERVER_DIR" ]; then
    mv "${DATA_DIR}/Server" "$SERVER_DIR"
elif [ -d "${DATA_DIR}/Server" ]; then
    rm -rf "$SERVER_DIR"
    mv "${DATA_DIR}/Server" "$SERVER_DIR"
fi

printf "%sdone%s\n" "${GREEN}" "${NC}"

# Verify
if [ ! -f "$SERVER_JAR" ] || [ ! -f "$ASSETS_FILE" ]; then
    log_error "Required files not found after extraction"
    exit 1
fi

# Save version
echo "$latest_version" > "${DATA_DIR}/.version"

log_separator
log_info "Update complete!"
log_info "Version: $latest_version"
log_separator
