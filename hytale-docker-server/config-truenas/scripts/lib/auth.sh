#!/bin/bash
# =============================================================================
# Authentication Functions
# =============================================================================
# OAuth2 Device Code Flow authentication for Hytale Server
# Manages tokens, refresh, and session creation
# Updates state files for Web UI integration
# =============================================================================

# Prevent double-sourcing
[[ -n "${_AUTH_LOADED:-}" ]] && return 0
_AUTH_LOADED=1

# =============================================================================
# Configuration
# =============================================================================
AUTH_CACHE="${AUTH_CACHE:-${DATA_DIR:-.}/.auth}"
TOKENS_FILE="${AUTH_CACHE}/tokens.json"

OAUTH_URL="https://oauth.accounts.hytale.com"
ACCOUNT_URL="https://account-data.hytale.com"
SESSION_URL="https://sessions.hytale.com"
CLIENT_ID="hytale-server"
SCOPE="openid offline auth:server"

# Token variables (populated during auth)
ACCESS_TOKEN=""
REFRESH_TOKEN=""
PROFILE_UUID=""
PROFILE_NAME=""
SESSION_TOKEN=""
IDENTITY_TOKEN=""

# =============================================================================
# JWT Utilities
# =============================================================================

# Base64 URL decode
base64url_decode() {
    local b64="$1"
    # Add padding
    while (( ${#b64} % 4 != 0 )); do 
        b64+="="
    done
    echo "$b64" | tr '_-' '/+' | base64 -d 2>/dev/null
}

# Check if JWT token is expired (with 5 minute buffer)
is_token_expired() {
    local token="$1"
    [[ -z "$token" ]] && return 0
    
    IFS='.' read -r _ payload _ <<< "$token"
    local payload_json
    payload_json=$(base64url_decode "$payload")
    
    local exp now
    exp=$(echo "$payload_json" | jq -r '.exp // 0')
    now=$(date +%s)
    
    # Expired if current time + 5 minutes >= expiry
    [[ "$((now + 300))" -ge "$exp" ]]
}

# Get token expiry time as ISO string
get_token_expiry() {
    local token="$1"
    [[ -z "$token" ]] && return
    
    IFS='.' read -r _ payload _ <<< "$token"
    local payload_json
    payload_json=$(base64url_decode "$payload")
    
    local exp
    exp=$(echo "$payload_json" | jq -r '.exp // 0')
    date -d "@$exp" -Iseconds 2>/dev/null || date -r "$exp" -Iseconds 2>/dev/null || echo ""
}

# =============================================================================
# Token Storage
# =============================================================================

# Initialize auth cache directory
init_auth_cache() {
    mkdir -p "$AUTH_CACHE"
    chmod 700 "$AUTH_CACHE"
}

# Load cached tokens from file
load_cached_tokens() {
    [[ ! -f "$TOKENS_FILE" ]] && return 1
    
    # Validate JSON
    if ! jq empty "$TOKENS_FILE" 2>/dev/null; then
        log_warn "Invalid token cache, removing..."
        rm -f "$TOKENS_FILE"
        return 1
    fi
    
    ACCESS_TOKEN=$(jq -r '.access_token // empty' "$TOKENS_FILE")
    REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$TOKENS_FILE")
    PROFILE_UUID=$(jq -r '.profile_uuid // empty' "$TOKENS_FILE")
    PROFILE_NAME=$(jq -r '.profile_name // empty' "$TOKENS_FILE")
    
    if [[ -z "$ACCESS_TOKEN" ]] || [[ -z "$REFRESH_TOKEN" ]] || [[ -z "$PROFILE_UUID" ]]; then
        return 1
    fi
    
    return 0
}

# Save tokens to file
save_auth_tokens() {
    init_auth_cache
    
    cat > "$TOKENS_FILE" << EOF
{
  "access_token": "$ACCESS_TOKEN",
  "refresh_token": "$REFRESH_TOKEN",
  "profile_uuid": "$PROFILE_UUID",
  "profile_name": "$PROFILE_NAME",
  "timestamp": $(date +%s)
}
EOF
    chmod 600 "$TOKENS_FILE"
    log_debug "Auth tokens saved"
}

# =============================================================================
# Token Refresh
# =============================================================================

# Refresh access token using refresh token
refresh_access_token() {
    # Skip if token is still valid
    if ! is_token_expired "$ACCESS_TOKEN"; then
        log_debug "Access token still valid"
        return 0
    fi
    
    log_step "Refreshing access token"
    
    local response
    response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "grant_type=refresh_token" \
        -d "refresh_token=${REFRESH_TOKEN}")
    
    local new_access new_refresh error
    error=$(echo "$response" | jq -r '.error // empty')
    
    if [[ -n "$error" ]]; then
        log_step_fail
        log_error "Token refresh failed: $error"
        return 1
    fi
    
    new_access=$(echo "$response" | jq -r '.access_token // empty')
    new_refresh=$(echo "$response" | jq -r '.refresh_token // empty')
    
    if [[ -z "$new_access" ]]; then
        log_step_fail
        return 1
    fi
    
    ACCESS_TOKEN="$new_access"
    [[ -n "$new_refresh" ]] && REFRESH_TOKEN="$new_refresh"
    
    save_auth_tokens
    log_step_done
    return 0
}

# =============================================================================
# OAuth Device Code Flow
# =============================================================================

# Perform full device code authentication flow
perform_device_auth() {
    log_step "Requesting device code"
    
    local device_response
    device_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/device/auth" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "scope=${SCOPE}")
    
    local device_code user_code verification_uri interval expires_in
    device_code=$(echo "$device_response" | jq -r '.device_code')
    user_code=$(echo "$device_response" | jq -r '.user_code')
    verification_uri=$(echo "$device_response" | jq -r '.verification_uri_complete')
    interval=$(echo "$device_response" | jq -r '.interval // 5')
    expires_in=$(echo "$device_response" | jq -r '.expires_in // 900')
    
    if [[ -z "$device_code" ]] || [[ "$device_code" == "null" ]]; then
        log_step_fail
        log_error "Failed to get device code"
        return 1
    fi
    
    log_step_done
    
    # Update state to show auth pending WITH the URL and code for Web UI
    state_set_auth "pending" "" "" "$verification_uri" "$user_code"
    
    # Display authentication URL
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                         AUTHENTICATION REQUIRED                              ║"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                              ║"
    echo "║  Option 1: Visit this URL directly:                                          ║"
    echo "║  $verification_uri"
    echo "║                                                                              ║"
    echo "║  Option 2: Go to: https://oauth.accounts.hytale.com/oauth2/device/verify     ║"
    echo "║  And enter code: $user_code"
    echo "║                                                                              ║"
    echo "║  IMPORTANT: Complete authentication within ${expires_in} seconds!            ║"
    echo "║  DO NOT restart the container - you will get a new code!                     ║"
    echo "║                                                                              ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_info "Auth URL: $verification_uri"
    log_info "Or enter code: $user_code"
    log_step "Waiting for authentication"
    
    local elapsed=0
    ACCESS_TOKEN=""
    
    while [[ $elapsed -lt $expires_in ]]; do
        sleep "$interval"
        elapsed=$((elapsed + interval))
        
        local token_response
        token_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
            -H "Content-Type: application/x-www-form-urlencoded" \
            -d "client_id=${CLIENT_ID}" \
            -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
            -d "device_code=${device_code}")
        
        local error
        error=$(echo "$token_response" | jq -r '.error // empty')
        
        case "$error" in
            "authorization_pending")
                echo -n "."
                continue
                ;;
            "slow_down")
                interval=$((interval + 1))
                continue
                ;;
            "")
                ACCESS_TOKEN=$(echo "$token_response" | jq -r '.access_token')
                REFRESH_TOKEN=$(echo "$token_response" | jq -r '.refresh_token')
                
                if [[ -n "$ACCESS_TOKEN" ]] && [[ "$ACCESS_TOKEN" != "null" ]]; then
                    echo ""
                    log_step_status "authenticated" "$GREEN"
                    # Clear pending state immediately so Web UI dismisses the auth popup
                    # (authenticate() will update again with profile info once fetched)
                    state_set_auth "authenticated"
                    break
                fi
                ;;
            *)
                echo ""
                log_step_fail
                log_error "Authentication error: $error"
                state_set_auth "failed" "" ""
                return 1
                ;;
        esac
    done
    
    if [[ -z "$ACCESS_TOKEN" ]]; then
        echo ""
        log_step_fail
        log_error "Authentication timed out"
        state_set_auth "timeout" "" ""
        return 1
    fi
    
    return 0
}

# =============================================================================
# Profile & Session
# =============================================================================

# Fetch user profile
fetch_profile() {
    log_step "Fetching profile"
    
    local profiles_response
    profiles_response=$(curl -s -X GET "${ACCOUNT_URL}/my-account/get-profiles" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    PROFILE_UUID=$(echo "$profiles_response" | jq -r '.profiles[0].uuid // empty')
    PROFILE_NAME=$(echo "$profiles_response" | jq -r '.profiles[0].username // empty')
    
    if [[ -z "$PROFILE_UUID" ]]; then
        log_step_fail
        log_error "No profiles found"
        return 1
    fi
    
    log_step_status "$PROFILE_NAME" "$GREEN"
    return 0
}

# Create game session
create_game_session() {
    log_step "Creating game session"
    
    local session_response
    session_response=$(curl -s -X POST "${SESSION_URL}/game-session/new" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"uuid\": \"${PROFILE_UUID}\"}")
    
    SESSION_TOKEN=$(echo "$session_response" | jq -r '.sessionToken // empty')
    IDENTITY_TOKEN=$(echo "$session_response" | jq -r '.identityToken // empty')
    
    if [[ -z "$SESSION_TOKEN" ]] || [[ "$SESSION_TOKEN" == "null" ]]; then
        log_step_fail
        log_error "Failed to create game session"
        local error_msg
        error_msg=$(echo "$session_response" | jq -r '.message // .error // empty')
        [[ -n "$error_msg" ]] && log_error "Details: $error_msg"
        return 1
    fi
    
    log_step_done
    
    # Export for server args
    export SESSION_TOKEN IDENTITY_TOKEN
    export OWNER_UUID="$PROFILE_UUID"
    
    return 0
}

# =============================================================================
# Main Authentication Function
# =============================================================================

# Full authentication flow with caching and state updates
authenticate() {
    log_section "Authentication"
    
    init_auth_cache
    
    # Check for pre-injected tokens (hosting provider mode)
    if [[ -n "${HYTALE_SERVER_SESSION_TOKEN:-}" ]] && [[ -n "${HYTALE_SERVER_IDENTITY_TOKEN:-}" ]]; then
        log_step "Using injected tokens"
        SESSION_TOKEN="$HYTALE_SERVER_SESSION_TOKEN"
        IDENTITY_TOKEN="$HYTALE_SERVER_IDENTITY_TOKEN"
        OWNER_UUID="${HYTALE_OWNER_UUID:-}"
        export SESSION_TOKEN IDENTITY_TOKEN OWNER_UUID
        log_step_done
        state_set_auth "authenticated" "injected" ""
        return 0
    fi
    
    # Try cached tokens
    if load_cached_tokens; then
        log_step "Loading cached tokens"
        log_step_done
        
        if refresh_access_token; then
            if create_game_session; then
                local expiry
                expiry=$(get_token_expiry "$ACCESS_TOKEN")
                state_set_auth "authenticated" "$PROFILE_NAME" "$expiry"
                save_auth_tokens
                return 0
            fi
        fi
        
        log_warn "Cached tokens invalid, re-authenticating..."
    fi
    
    # Perform full authentication
    if ! perform_device_auth; then
        return 1
    fi
    
    if ! fetch_profile; then
        return 1
    fi
    
    save_auth_tokens
    
    if ! create_game_session; then
        return 1
    fi
    
    # Update state
    local expiry
    expiry=$(get_token_expiry "$ACCESS_TOKEN")
    state_set_auth "authenticated" "$PROFILE_NAME" "$expiry"
    
    return 0
}

# Export functions
export -f base64url_decode is_token_expired get_token_expiry
export -f init_auth_cache load_cached_tokens save_auth_tokens
export -f refresh_access_token perform_device_auth
export -f fetch_profile create_game_session authenticate
