#!/bin/bash
# =============================================================================
# Hytale Server Options Builder
# =============================================================================
# Maps all environment variables to server CLI options
# Based on comprehensive analysis of all 40+ server options
# =============================================================================

build_hytale_options() {
    local opts=""
    
    # --accept-early-plugins
    if is_true "${HYTALE_ACCEPT_EARLY_PLUGINS:-false}"; then
        opts="$opts --accept-early-plugins"
    fi
    
    # --allow-op
    if is_true "${HYTALE_ALLOW_OP:-false}"; then
        opts="$opts --allow-op"
    fi
    
    # --auth-mode (authenticated|offline)
    if [ -n "${HYTALE_AUTH_MODE:-}" ]; then
        case "${HYTALE_AUTH_MODE}" in
            authenticated|offline)
                opts="$opts --auth-mode=${HYTALE_AUTH_MODE}"
                ;;
            *)
                log_warn "Invalid HYTALE_AUTH_MODE: ${HYTALE_AUTH_MODE}"
                ;;
        esac
    fi
    
    # --backup
    if is_true "${HYTALE_BACKUP:-false}"; then
        opts="$opts --backup"
    fi
    
    # --backup-dir
    if [ -n "${HYTALE_BACKUP_DIR:-}" ]; then
        opts="$opts --backup-dir=${HYTALE_BACKUP_DIR}"
    elif is_true "${HYTALE_BACKUP:-false}"; then
        opts="$opts --backup-dir=${DATA_DIR}/backups"
    fi
    
    # --backup-frequency
    if [ -n "${HYTALE_BACKUP_FREQUENCY:-}" ]; then
        opts="$opts --backup-frequency=${HYTALE_BACKUP_FREQUENCY}"
    fi
    
    # --backup-max-count
    if [ -n "${HYTALE_BACKUP_MAX_COUNT:-}" ]; then
        opts="$opts --backup-max-count=${HYTALE_BACKUP_MAX_COUNT}"
    fi
    
    # --bare
    if is_true "${HYTALE_BARE:-false}"; then
        opts="$opts --bare"
    fi
    
    # --boot-command
    if [ -n "${HYTALE_BOOT_COMMAND:-}" ]; then
        opts="$opts --boot-command=${HYTALE_BOOT_COMMAND}"
    fi
    
    # --client-pid
    if [ -n "${HYTALE_CLIENT_PID:-}" ]; then
        opts="$opts --client-pid=${HYTALE_CLIENT_PID}"
    fi
    
    # --disable-asset-compare
    if is_true "${HYTALE_DISABLE_ASSET_COMPARE:-false}"; then
        opts="$opts --disable-asset-compare"
    fi
    
    # --disable-cpb-build
    if is_true "${HYTALE_DISABLE_CPB_BUILD:-false}"; then
        opts="$opts --disable-cpb-build"
    fi
    
    # --disable-file-watcher
    if is_true "${HYTALE_DISABLE_FILE_WATCHER:-false}"; then
        opts="$opts --disable-file-watcher"
    fi
    
    # --disable-sentry
    if is_true "${HYTALE_DISABLE_SENTRY:-${DISABLE_SENTRY:-false}}"; then
        opts="$opts --disable-sentry"
    fi
    
    # --early-plugins
    if [ -n "${HYTALE_EARLY_PLUGINS:-}" ]; then
        opts="$opts --early-plugins=${HYTALE_EARLY_PLUGINS}"
    fi
    
    # --event-debug
    if is_true "${HYTALE_EVENT_DEBUG:-false}"; then
        opts="$opts --event-debug"
    fi
    
    # --force-network-flush
    if [ -n "${HYTALE_FORCE_NETWORK_FLUSH:-}" ]; then
        opts="$opts --force-network-flush=${HYTALE_FORCE_NETWORK_FLUSH}"
    fi
    
    # --generate-schema
    if is_true "${HYTALE_GENERATE_SCHEMA:-false}"; then
        opts="$opts --generate-schema"
    fi
    
    # --log
    if [ -n "${HYTALE_LOG:-}" ]; then
        opts="$opts --log=${HYTALE_LOG}"
    fi
    
    # --migrate-worlds
    if [ -n "${HYTALE_MIGRATE_WORLDS:-}" ]; then
        opts="$opts --migrate-worlds=${HYTALE_MIGRATE_WORLDS}"
    fi
    
    # --migrations
    if [ -n "${HYTALE_MIGRATIONS:-}" ]; then
        opts="$opts --migrations=${HYTALE_MIGRATIONS}"
    fi
    
    # --mods
    if [ -n "${HYTALE_MODS:-}" ]; then
        opts="$opts --mods=${HYTALE_MODS}"
    elif [ -d "${DATA_DIR}/mods" ] && [ "$(ls -A ${DATA_DIR}/mods 2>/dev/null)" ]; then
        opts="$opts --mods=${DATA_DIR}/mods"
    fi
    
    # --owner-name
    if [ -n "${HYTALE_OWNER_NAME:-}" ]; then
        opts="$opts --owner-name=${HYTALE_OWNER_NAME}"
    fi
    
    # --prefab-cache
    if [ -n "${HYTALE_PREFAB_CACHE:-}" ]; then
        opts="$opts --prefab-cache=${HYTALE_PREFAB_CACHE}"
    fi
    
    # --shutdown-after-validate
    if is_true "${HYTALE_SHUTDOWN_AFTER_VALIDATE:-false}"; then
        opts="$opts --shutdown-after-validate"
    fi
    
    # --singleplayer
    if is_true "${HYTALE_SINGLEPLAYER:-false}"; then
        opts="$opts --singleplayer"
    fi
    
    # --transport
    if [ -n "${HYTALE_TRANSPORT:-}" ]; then
        opts="$opts --transport=${HYTALE_TRANSPORT}"
    fi
    
    # --universe
    if [ -n "${HYTALE_UNIVERSE:-}" ]; then
        opts="$opts --universe=${HYTALE_UNIVERSE}"
    fi
    
    # --validate-assets
    if is_true "${HYTALE_VALIDATE_ASSETS:-false}"; then
        opts="$opts --validate-assets"
    fi
    
    # --validate-prefabs
    if [ -n "${HYTALE_VALIDATE_PREFABS:-}" ]; then
        opts="$opts --validate-prefabs=${HYTALE_VALIDATE_PREFABS}"
    fi
    
    # --validate-world-gen
    if is_true "${HYTALE_VALIDATE_WORLD_GEN:-false}"; then
        opts="$opts --validate-world-gen"
    fi
    
    # --world-gen
    if [ -n "${HYTALE_WORLD_GEN:-}" ]; then
        opts="$opts --world-gen=${HYTALE_WORLD_GEN}"
    fi
    
    # Custom extra arguments
    if [ -n "${HYTALE_EXTRA_ARGS:-}" ]; then
        opts="$opts ${HYTALE_EXTRA_ARGS}"
    fi
    
    echo "$opts"
}

export -f build_hytale_options
