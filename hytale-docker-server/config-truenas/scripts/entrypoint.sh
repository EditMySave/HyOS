#!/bin/bash
# =============================================================================
# Hytale Server Entrypoint - TrueNAS SCALE
# =============================================================================
# Modular entrypoint with Web UI-ready architecture
# Sources library scripts for clean separation of concerns
# =============================================================================

# Unbuffered output for immediate logging (TrueNAS compatibility)
exec 1> >(stdbuf -oL cat 2>/dev/null || cat) 2>&1
export PYTHONUNBUFFERED=1

# =============================================================================
# Early Diagnostics (before anything else)
# =============================================================================
echo "=========================================="
echo "Hytale Server Container Starting..."
echo "=========================================="
echo "Date: $(date)"
echo "User: $(id)"
echo "Architecture: $(uname -m)"
echo "Working directory: $(pwd)"
echo "=========================================="

# =============================================================================
# Configuration
# =============================================================================
export SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
export DATA_DIR="${DATA_DIR:-/data}"
export SERVER_DIR="${DATA_DIR}/server"
export SERVER_JAR="${SERVER_DIR}/HytaleServer.jar"
export ASSETS_FILE="${DATA_DIR}/Assets.zip"

# TrueNAS defaults
export PUID="${PUID:-568}"
export PGID="${PGID:-568}"
export UMASK="${UMASK:-002}"

# Server defaults
export SERVER_PORT="${SERVER_PORT:-5520}"
export JAVA_XMS="${JAVA_XMS:-4G}"
export JAVA_XMX="${JAVA_XMX:-8G}"
export ENABLE_AOT="${ENABLE_AOT:-true}"
export PATCHLINE="${PATCHLINE:-release}"

# Auto-update defaults
export AUTO_UPDATE="${AUTO_UPDATE:-false}"
export AUTO_UPDATE_INTERVAL="${AUTO_UPDATE_INTERVAL:-3600}"
export AUTO_UPDATE_TIME="${AUTO_UPDATE_TIME:-}"
export AUTO_UPDATE_RESTART="${AUTO_UPDATE_RESTART:-true}"
export AUTO_UPDATE_BACKUP="${AUTO_UPDATE_BACKUP:-true}"

# =============================================================================
# Source Library Scripts
# =============================================================================
source "${SCRIPTS_DIR}/lib/utils.sh"
source "${SCRIPTS_DIR}/lib/state.sh"
source "${SCRIPTS_DIR}/lib/auth.sh"
source "${SCRIPTS_DIR}/lib/options.sh"
source "${SCRIPTS_DIR}/lib/config.sh"
source "${SCRIPTS_DIR}/lib/download.sh"
source "${SCRIPTS_DIR}/lib/api.sh"

# Now enable strict mode (after sourcing)
set -eo pipefail

# =============================================================================
# Architecture Check
# =============================================================================
# check_architecture() {
#     local arch
#     arch=$(uname -m)
    
#     if [[ "$arch" != "x86_64" ]] && [[ "$arch" != "amd64" ]]; then
#         log_error "This container only supports x86_64/amd64 architecture"
#         log_error "Your system is: $arch"
#         log_error "The Hytale downloader binary is x86_64 only"
#         exit 1
#     fi
    
#     log_debug "Architecture OK: $arch"
# }

# =============================================================================
# Permission Check
# =============================================================================
check_permissions() {
    log_debug "Checking DATA_DIR permissions..."
    
    if [[ ! -d "$DATA_DIR" ]]; then
        log_error "DATA_DIR does not exist: $DATA_DIR"
        exit 1
    fi
    
    if ! touch "$DATA_DIR/.write-test" 2>/dev/null; then
        log_error "Cannot write to DATA_DIR: $DATA_DIR"
        log_error "Container user $(id) lacks write permissions"
        log_error "Fix: Set dataset owner to match container user"
        exit 1
    fi
    rm -f "$DATA_DIR/.write-test"
    
    log_debug "Permissions OK"
}

# =============================================================================
# User Setup (if running as root)
# =============================================================================
setup_user() {
    # Skip if not running as root
    if [[ "$(id -u)" != "0" ]]; then
        log_debug "Not running as root, skipping user setup"
        return 0
    fi
    
    log_info "Setting up user (PUID=$PUID, PGID=$PGID)"
    
    # Modify existing user/group to match PUID/PGID
    if [[ "$(id -u hytale 2>/dev/null)" != "$PUID" ]]; then
        usermod -u "$PUID" hytale 2>/dev/null || true
    fi
    
    if [[ "$(getent group hytale | cut -d: -f3)" != "$PGID" ]]; then
        groupmod -g "$PGID" hytale 2>/dev/null || true
    fi
    
    # Set umask
    umask "$UMASK"
    
    # Fix ownership
    chown -R hytale:hytale "$DATA_DIR" 2>/dev/null || log_warn "Could not change ownership of $DATA_DIR"
    
    log_debug "User setup complete"
}

# =============================================================================
# Directory Setup
# =============================================================================
setup_directories() {
    log_debug "Creating directories..."
    
    mkdir -p \
        "$SERVER_DIR" \
        "${DATA_DIR}/backups" \
        "${DATA_DIR}/mods" \
        "${DATA_DIR}/universe" \
        "${DATA_DIR}/logs" \
        "${DATA_DIR}/.auth" \
        2>/dev/null || true
    
    # Initialize state directory
    init_state_dir
}

# =============================================================================
# Mod Validation (Pre-flight)
# =============================================================================
validate_mods() {
    local mods_dir="${DATA_DIR}/mods"
    [[ ! -d "$mods_dir" ]] && return 0

    local jar_count=0
    local warn_count=0

    for jar in "$mods_dir"/*.jar; do
        [[ -f "$jar" ]] || continue
        jar_count=$((jar_count + 1))

        local name
        name=$(basename "$jar")

        # Extract manifest.json from JAR (it's a zip file)
        local manifest
        manifest=$(unzip -p "$jar" manifest.json 2>/dev/null) || {
            log_warn "Mod $name: no manifest.json found — may fail to load"
            warn_count=$((warn_count + 1))
            continue
        }

        # Check required fields
        local main_class group mod_name
        main_class=$(echo "$manifest" | jq -r '.Main // empty' 2>/dev/null)
        group=$(echo "$manifest" | jq -r '.Group // empty' 2>/dev/null)
        mod_name=$(echo "$manifest" | jq -r '.Name // empty' 2>/dev/null)

        if [[ -z "$main_class" ]]; then
            log_warn "Mod $name: content-only mod (no Main class) — patch via Server Manager UI"
            warn_count=$((warn_count + 1))
        fi

        if [[ -z "$group" ]] || [[ -z "$mod_name" ]]; then
            log_warn "Mod $name: missing 'Group' or 'Name' in manifest.json"
            warn_count=$((warn_count + 1))
        fi

        # Check ServerVersion — raw build versions (YYYY.MM.DD-hexhash) crash SemverRange.fromString()
        local server_ver
        server_ver=$(echo "$manifest" | jq -r '.ServerVersion // empty' 2>/dev/null)

        if [[ -n "$server_ver" ]] && [[ "$server_ver" != "*" ]]; then
            if [[ "$server_ver" =~ ^[0-9]{4}\.[0-9]{2}\.[0-9]{2}-[0-9a-f]+$ ]]; then
                log_warn "Mod $name: invalid ServerVersion \"$server_ver\" (raw build version, not a semver range) — quarantining"
                mkdir -p "${mods_dir}/.disabled"
                mv "$jar" "${mods_dir}/.disabled/${name}"
                warn_count=$((warn_count + 1))
                continue
            fi
        fi

        log_debug "Mod $name: ${group:-?}:${mod_name:-?} -> ${main_class:-(no Main class)}"
    done

    if [[ $jar_count -gt 0 ]]; then
        local summary="$jar_count mod(s) scanned"
        [[ $warn_count -gt 0 ]] && summary="$summary, $warn_count warning(s)"
        if [[ $warn_count -gt 0 ]]; then
            log_warn "Mod validation: $summary"
        else
            log_info "Mod validation: $summary"
        fi
    fi
}

# =============================================================================
# Mod Monitor (Background)
# =============================================================================
monitor_mod_loading() {
    local server_version="$1"
    (
        sleep 30

        # Find most recent server log
        local log_file
        log_file=$(ls -t "$SERVER_DIR/logs/"*_server.log 2>/dev/null | head -1)
        [[ -z "$log_file" ]] && exit 0

        # Parse failed mods (BusyBox grep — no -P support)
        local failed_mods=()
        while IFS= read -r line; do
            local jar_name
            jar_name=$(echo "$line" | sed -n 's|.*Failed to load plugin /data/mods/\([^ ]*\.jar\).*|\1|p')
            [[ -n "$jar_name" ]] && failed_mods+=("$jar_name")
        done < <(grep "Failed to load plugin" "$log_file" 2>/dev/null)

        # Parse loaded mods (from /data/mods only, not built-in plugins)
        local loaded_mods=()
        while IFS= read -r line; do
            local jar_name
            jar_name=$(echo "$line" | sed -n 's|.*from path \([^ ]*\.jar\).*|\1|p')
            [[ -n "$jar_name" ]] && loaded_mods+=("$jar_name")
        done < <(grep "from path" "$log_file" 2>/dev/null)

        # Filter loaded_mods to remove any that also appear in failed_mods
        local actually_loaded=()
        for mod in "${loaded_mods[@]}"; do
            local is_failed=false
            for failed in "${failed_mods[@]}"; do
                [[ "$mod" == "$failed" ]] && is_failed=true && break
            done
            $is_failed || actually_loaded+=("$mod")
        done

        # Build JSON and update state
        local loaded_json failed_json
        loaded_json=$(json_array "${actually_loaded[@]}")

        # Build failed array with error info
        local failed_entries=()
        for mod in "${failed_mods[@]}"; do
            failed_entries+=($(json_object "file" "$mod" "error" "NullPointerException in PluginClassLoader"))
            state_add_broken_mod "$mod" "$server_version"
        done
        failed_json=$(json_array "${failed_entries[@]}")

        state_set_mods "$loaded_json" "$failed_json"

        if [[ ${#failed_mods[@]} -gt 0 ]]; then
            log_warn "Mod loading: ${#actually_loaded[@]} loaded, ${#failed_mods[@]} failed"
            log_warn "Failed mods: ${failed_mods[*]}"
        fi
    ) &
}

# =============================================================================
# Auto-Skip Broken Mods
# =============================================================================
skip_broken_mods() {
    if ! is_true "${SKIP_BROKEN_MODS:-false}"; then
        return 0
    fi

    local server_version
    server_version=$(get_current_version)

    local broken_mods
    broken_mods=$(state_get_broken_mods "$server_version")
    [[ -z "$broken_mods" ]] && return 0

    mkdir -p "${DATA_DIR}/mods/.disabled"

    local count=0
    while IFS= read -r mod_file; do
        [[ -z "$mod_file" ]] && continue
        if [[ -f "${DATA_DIR}/mods/${mod_file}" ]]; then
            mv "${DATA_DIR}/mods/${mod_file}" "${DATA_DIR}/mods/.disabled/${mod_file}"
            log_warn "Quarantined broken mod: $mod_file (moved to mods/.disabled/)"
            count=$((count + 1))
        fi
    done <<< "$broken_mods"

    if [[ $count -gt 0 ]]; then
        log_info "Quarantined $count broken mod(s). Re-enable: move from mods/.disabled/ back to mods/ and set SKIP_BROKEN_MODS=false"
    fi
}

# =============================================================================
# Launch and Wait (replaces exec — captures exit code for crash detection)
# =============================================================================
launch_and_wait() {
    "$@" &
    JAVA_PID=$!

    state_set_server "running" "$JAVA_PID"
    monitor_mod_loading "$(get_current_version)"

    local exit_code=0
    wait $JAVA_PID || exit_code=$?

    if [[ $exit_code -eq 0 ]]; then
        log_info "Server exited cleanly (exit code 0)"
        state_set_server "stopped"
    elif [[ $exit_code -ge 128 ]]; then
        log_info "Server killed by signal $((exit_code - 128)) (exit code $exit_code)"
        state_set_server "stopped"
    else
        log_error "Server crashed (exit code $exit_code)"
        state_set_server "crashed"
    fi

    stop_localtonet || true
    exit $exit_code
}

# =============================================================================
# Server Launch
# =============================================================================
start_server() {
    log_section "Server Startup"
    
    # Build arguments
    local java_args server_args
    java_args=$(build_java_args)
    server_args=$(build_server_args)
    
    # Log startup info
    log_info "Port: ${SERVER_PORT}/udp"
    log_info "Memory: ${JAVA_XMS} - ${JAVA_XMX}"
    log_info "GC: $(is_true "${USE_ZGC:-false}" && echo "ZGC" || echo "G1GC")"
    log_info "AOT: $(is_true "$ENABLE_AOT" && [[ -f "${SERVER_DIR}/HytaleServer.aot" ]] && echo "enabled" || echo "disabled")"
    log_info "User: $(id)"
    
    log_separator
    
    # Update state
    state_set_server "starting"
    
    cd "$SERVER_DIR"

    # Execute server
    log_info "Starting Java process..."

    launch_and_wait java $java_args -jar "$SERVER_JAR" $server_args
}

# =============================================================================
# Main
# =============================================================================
main() {
    log_section "Hytale Server (TrueNAS)"
    log_info "Version: Enterprise-Modular"
    
    # Pre-flight checks
    # check_architecture
    check_permissions
    
    # Setup
    setup_user
    setup_directories
    
    # Initialize state (after directories are created)
    state_set_server "starting"
    
    # Check for scheduled update flag
    local was_scheduled=false
    if state_is_update_scheduled; then
        log_info "Scheduled update detected - will update on this restart"
        local scheduled_info
        scheduled_info=$(state_get_update_scheduled)
        local target_version
        target_version=$(echo "$scheduled_info" | jq -r '.target_version // empty' 2>/dev/null || echo "")
        if [[ -n "$target_version" ]] && [[ "$target_version" != "null" ]]; then
            log_info "Target version: $target_version"
        fi
        
        # Temporarily enable AUTO_UPDATE for this restart
        export AUTO_UPDATE="true"
        was_scheduled=true
        
        # Clear the flag (will be re-created if update fails)
        state_clear_update_scheduled
    fi
    
    # Download server files
    download_server_files || {
        state_set_server "crashed"
        exit 1
    }
    
    # If scheduled update was applied, log success
    if [[ "$was_scheduled" == "true" ]]; then
        log_success "Scheduled update completed successfully"
    fi

    # Auto-skip broken mods (before server launch)
    skip_broken_mods

    # Validate mod JARs (check manifests before server tries to load them)
    validate_mods

    # Install plugins (from /opt/plugins)
    api_install_plugins || {
        log_warn "Plugin installation failed, continuing without plugins"
    }
    
    # Generate server configuration
    generate_config || {
        log_warn "Config generation failed, continuing with defaults"
    }
    
    # Generate API plugin configuration
    api_generate_config || {
        log_warn "API config generation failed, continuing without API"
    }
    
    # Authenticate
    authenticate || {
        state_set_server "crashed"
        exit 1
    }
    
    # Refresh version info after authentication
    log_info "Refreshing version check..."
    current=$(get_current_version)
    latest=$(get_latest_version)
    state_set_version "$current" "$latest"
    
    # Start background version checker (checks every hour by default)
    if is_true "${VERSION_CHECK_ENABLED:-true}"; then
        VERSION_CHECK_INTERVAL="${VERSION_CHECK_INTERVAL:-3600}"
        (
            while true; do
                sleep "$VERSION_CHECK_INTERVAL"
                current=$(get_current_version)
                latest=$(get_latest_version)
                state_set_version "$current" "$latest"
            done
        ) &
    fi
    
    # Start server
    # If running as root, drop privileges first
    if [[ "$(id -u)" == "0" ]]; then
        log_info "Dropping privileges to hytale user..."
        
        # Build args while still root (has access to all vars)
        local java_args server_args
        java_args=$(build_java_args)
        server_args=$(build_server_args)
        
        cd "$SERVER_DIR"

        launch_and_wait su-exec hytale:hytale java $java_args -jar "$SERVER_JAR" $server_args
    else
        start_server
    fi
}

# =============================================================================
# Signal Handling
# =============================================================================
cleanup() {
    log_info "Received shutdown signal"
    if [[ -n "${JAVA_PID:-}" ]] && kill -0 "$JAVA_PID" 2>/dev/null; then
        log_info "Forwarding SIGTERM to Java (PID: $JAVA_PID)"
        kill -TERM "$JAVA_PID" 2>/dev/null || true
        # Don't exit here — wait in launch_and_wait will return with exit code 143
    else
        stop_localtonet || true
        state_set_server "stopped"
        exit 0
    fi
}

trap cleanup SIGTERM SIGINT

# =============================================================================
# Entry Point
# =============================================================================
main "$@"
