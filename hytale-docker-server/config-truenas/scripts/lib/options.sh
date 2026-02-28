#!/bin/bash
# =============================================================================
# Hytale Server Options Builder
# =============================================================================
# Maps all environment variables to server CLI options
# Supports all 40+ server options via HYTALE_* environment variables
# =============================================================================

# Prevent double-sourcing
[[ -n "${_OPTIONS_LOADED:-}" ]] && return 0
_OPTIONS_LOADED=1

# =============================================================================
# JVM Options Builder
# =============================================================================

build_java_args() {
    local args=""
    
    # Memory settings
    args="$args -Xms${JAVA_XMS:-1G} -Xmx${JAVA_XMX:-3G}"
    
    # Container support
    args="$args -XX:+UseContainerSupport"
    
    # Garbage collector selection
    if is_true "${USE_ZGC:-false}"; then
        args="$args -XX:+UseZGC"
        [[ -n "${ZGC_INTERVAL:-}" ]] && args="$args -XX:ZCollectionInterval=${ZGC_INTERVAL}"
    else
        # G1GC (default)
        args="$args -XX:+UseG1GC"
        args="$args -XX:MaxGCPauseMillis=${G1_MAX_PAUSE:-200}"
        [[ -n "${G1_NEW_SIZE_PERCENT:-}" ]] && args="$args -XX:G1NewSizePercent=${G1_NEW_SIZE_PERCENT}"
        [[ -n "${G1_MAX_NEW_SIZE_PERCENT:-}" ]] && args="$args -XX:G1MaxNewSizePercent=${G1_MAX_NEW_SIZE_PERCENT}"
        [[ -n "${G1_HEAP_REGION_SIZE:-}" ]] && args="$args -XX:G1HeapRegionSize=${G1_HEAP_REGION_SIZE}"
    fi
    
    # Performance optimizations
    args="$args -XX:+UseStringDeduplication"
    args="$args -XX:+AlwaysPreTouch"
    args="$args -XX:+ParallelRefProcEnabled"
    
    # AOT cache
    if is_true "${ENABLE_AOT:-true}"; then
        local aot_cache="${SERVER_DIR:-/data/server}/HytaleServer.aot"
        [[ -f "$aot_cache" ]] && args="$args -XX:AOTCache=${aot_cache}"
    fi
    
    # Class loading diagnostics (writes to separate file to avoid flooding container logs)
    if is_true "${DEBUG_CLASSLOADING:-false}"; then
        local classlog_dir="${DATA_DIR:-/data}/logs"
        mkdir -p "$classlog_dir" 2>/dev/null || true
        args="$args -Xlog:class+load=info:file=${classlog_dir}/classloading.log:tags,time,level"
    fi

    # Custom JVM options
    [[ -n "${JAVA_OPTS:-}" ]] && args="$args $JAVA_OPTS"
    [[ -n "${JVM_XX_OPTS:-}" ]] && args="$args $JVM_XX_OPTS"
    
    echo "$args"
}

# =============================================================================
# Server Options Builder
# =============================================================================

build_hytale_options() {
    local opts=""
    
    # --accept-early-plugins
    if is_true "${HYTALE_ACCEPT_EARLY_PLUGINS:-${ACCEPT_EARLY_PLUGINS:-false}}"; then
        opts="$opts --accept-early-plugins"
    fi
    
    # --allow-op
    if is_true "${HYTALE_ALLOW_OP:-${ALLOW_OP:-false}}"; then
        opts="$opts --allow-op"
    fi
    
    # --auth-mode (authenticated|offline)
    if [[ -n "${HYTALE_AUTH_MODE:-}" ]]; then
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
    if is_true "${HYTALE_BACKUP:-${ENABLE_BACKUP:-false}}"; then
        opts="$opts --backup"
    fi
    
    # --backup-dir
    if [[ -n "${HYTALE_BACKUP_DIR:-}" ]]; then
        opts="$opts --backup-dir=${HYTALE_BACKUP_DIR}"
    elif is_true "${HYTALE_BACKUP:-${ENABLE_BACKUP:-false}}"; then
        opts="$opts --backup-dir=${DATA_DIR:-/data}/backups"
    fi
    
    # --backup-frequency
    if [[ -n "${HYTALE_BACKUP_FREQUENCY:-${BACKUP_FREQUENCY:-}}" ]]; then
        opts="$opts --backup-frequency=${HYTALE_BACKUP_FREQUENCY:-${BACKUP_FREQUENCY}}"
    fi
    
    # --backup-max-count
    if [[ -n "${HYTALE_BACKUP_MAX_COUNT:-}" ]]; then
        opts="$opts --backup-max-count=${HYTALE_BACKUP_MAX_COUNT}"
    fi
    
    # --bare
    if is_true "${HYTALE_BARE:-false}"; then
        opts="$opts --bare"
    fi
    
    # --boot-command
    if [[ -n "${HYTALE_BOOT_COMMAND:-}" ]]; then
        opts="$opts --boot-command=${HYTALE_BOOT_COMMAND}"
    fi
    
    # --client-pid
    if [[ -n "${HYTALE_CLIENT_PID:-}" ]]; then
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
    if [[ -n "${HYTALE_EARLY_PLUGINS:-}" ]]; then
        opts="$opts --early-plugins=${HYTALE_EARLY_PLUGINS}"
    fi
    
    # --event-debug
    if is_true "${HYTALE_EVENT_DEBUG:-false}"; then
        opts="$opts --event-debug"
    fi
    
    # --force-network-flush
    if [[ -n "${HYTALE_FORCE_NETWORK_FLUSH:-}" ]]; then
        opts="$opts --force-network-flush=${HYTALE_FORCE_NETWORK_FLUSH}"
    fi
    
    # --generate-schema
    if is_true "${HYTALE_GENERATE_SCHEMA:-false}"; then
        opts="$opts --generate-schema"
    fi
    
    # --log
    if [[ -n "${HYTALE_LOG:-}" ]]; then
        opts="$opts --log=${HYTALE_LOG}"
    fi
    
    # --migrate-worlds
    if [[ -n "${HYTALE_MIGRATE_WORLDS:-}" ]]; then
        opts="$opts --migrate-worlds=${HYTALE_MIGRATE_WORLDS}"
    fi
    
    # --migrations
    if [[ -n "${HYTALE_MIGRATIONS:-}" ]]; then
        opts="$opts --migrations=${HYTALE_MIGRATIONS}"
    fi
    
    # --mods
    if [[ -n "${HYTALE_MODS:-}" ]]; then
        opts="$opts --mods=${HYTALE_MODS}"
    elif [[ -d "${DATA_DIR:-/data}/mods" ]] && [[ -n "$(ls -A "${DATA_DIR:-/data}/mods" 2>/dev/null)" ]]; then
        opts="$opts --mods=${DATA_DIR:-/data}/mods"
    fi
    
    # --owner-name
    if [[ -n "${HYTALE_OWNER_NAME:-}" ]]; then
        opts="$opts --owner-name=${HYTALE_OWNER_NAME}"
    fi
    
    # --prefab-cache
    if [[ -n "${HYTALE_PREFAB_CACHE:-}" ]]; then
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
    if [[ -n "${HYTALE_TRANSPORT:-}" ]]; then
        opts="$opts --transport=${HYTALE_TRANSPORT}"
    fi
    
    # --universe
    if [[ -n "${HYTALE_UNIVERSE:-}" ]]; then
        opts="$opts --universe=${HYTALE_UNIVERSE}"
    fi
    
    # --validate-assets
    if is_true "${HYTALE_VALIDATE_ASSETS:-false}"; then
        opts="$opts --validate-assets"
    fi
    
    # --validate-prefabs
    if [[ -n "${HYTALE_VALIDATE_PREFABS:-}" ]]; then
        opts="$opts --validate-prefabs=${HYTALE_VALIDATE_PREFABS}"
    fi
    
    # --validate-world-gen
    if is_true "${HYTALE_VALIDATE_WORLD_GEN:-false}"; then
        opts="$opts --validate-world-gen"
    fi
    
    # --world-gen
    if [[ -n "${HYTALE_WORLD_GEN:-}" ]]; then
        opts="$opts --world-gen=${HYTALE_WORLD_GEN}"
    fi
    
    # Custom extra arguments (passthrough)
    if [[ -n "${HYTALE_EXTRA_ARGS:-${SERVER_ARGS:-}}" ]]; then
        opts="$opts ${HYTALE_EXTRA_ARGS:-${SERVER_ARGS}}"
    fi
    
    echo "$opts"
}

# =============================================================================
# Full Server Args Builder
# =============================================================================

build_server_args() {
    local args=""
    
    # Required: Assets file
    args="$args --assets ${ASSETS_FILE:-${DATA_DIR:-/data}/Assets.zip}"
    
    # Required: Bind address
    args="$args --bind 0.0.0.0:${SERVER_PORT:-5520}"
    
    # Authentication tokens
    if [[ -n "${SESSION_TOKEN:-}" ]]; then
        args="$args --session-token ${SESSION_TOKEN}"
    fi
    
    if [[ -n "${IDENTITY_TOKEN:-}" ]]; then
        args="$args --identity-token ${IDENTITY_TOKEN}"
    fi
    
    if [[ -n "${OWNER_UUID:-${PROFILE_UUID:-}}" ]]; then
        args="$args --owner-uuid ${OWNER_UUID:-${PROFILE_UUID}}"
    fi
    
    # Build all Hytale options from environment
    args="$args $(build_hytale_options)"
    
    echo "$args"
}

# =============================================================================
# Options as JSON (for Web UI)
# =============================================================================

get_options_json() {
    json_object \
        "java_xms" "${JAVA_XMS:-1G}" \
        "java_xmx" "${JAVA_XMX:-3G}" \
        "gc_type" "$(is_true "${USE_ZGC:-false}" && echo "ZGC" || echo "G1GC")" \
        "aot_enabled" "${ENABLE_AOT:-true}" \
        "server_port" "${SERVER_PORT:-5520}" \
        "backup_enabled" "${HYTALE_BACKUP:-${ENABLE_BACKUP:-false}}" \
        "backup_frequency" "${HYTALE_BACKUP_FREQUENCY:-${BACKUP_FREQUENCY:-30}}" \
        "allow_op" "${HYTALE_ALLOW_OP:-${ALLOW_OP:-false}}" \
        "accept_early_plugins" "${HYTALE_ACCEPT_EARLY_PLUGINS:-${ACCEPT_EARLY_PLUGINS:-false}}" \
        "disable_sentry" "${HYTALE_DISABLE_SENTRY:-${DISABLE_SENTRY:-false}}" \
        "debug_classloading" "${DEBUG_CLASSLOADING:-false}"
}

# Export functions
export -f build_java_args build_hytale_options build_server_args get_options_json
