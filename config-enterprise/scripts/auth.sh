#!/bin/bash
# =============================================================================
# Authentication Functions
# =============================================================================

AUTH_CACHE="${AUTH_CACHE:-${DATA_DIR}/.auth}"
TOKENS_FILE="${AUTH_CACHE}/tokens.json"

OAUTH_URL="https://oauth.accounts.hytale.com"
ACCOUNT_URL="https://account-data.hytale.com"
SESSION_URL="https://sessions.hytale.com"
CLIENT_ID="hytale-server"
SCOPE="openid offline auth:server"

# Base64 URL decode
base64url_decode() {
    local b64="$1"
    while (( ${#b64} % 4 != 0 )); do b64+="="; done
    echo "$b64" | tr '_-' '/+' | base64 -d 2>/dev/null
}

# Check if JWT token is expired
is_token_expired() {
    local token="$1"
    if [ -z "$token" ]; then return 0; fi
    
    IFS='.' read -r _ payload _ <<< "$token"
    local payload_json
    payload_json=$(base64url_decode "$payload")
    
    local exp now
    exp=$(echo "$payload_json" | jq -r '.exp // 0')
    now=$(date +%s)
    
    [ "$((now + 300))" -ge "$exp" ]
}

# Load cached tokens
load_cached_tokens() {
    if [ ! -f "$TOKENS_FILE" ]; then
        return 1
    fi
    
    if ! jq empty "$TOKENS_FILE" 2>/dev/null; then
        log_warn "Invalid token cache, removing..."
        rm -f "$TOKENS_FILE"
        return 1
    fi
    
    ACCESS_TOKEN=$(jq -r '.access_token // empty' "$TOKENS_FILE")
    REFRESH_TOKEN=$(jq -r '.refresh_token // empty' "$TOKENS_FILE")
    PROFILE_UUID=$(jq -r '.profile_uuid // empty' "$TOKENS_FILE")
    
    if [ -z "$ACCESS_TOKEN" ] || [ -z "$REFRESH_TOKEN" ] || [ -z "$PROFILE_UUID" ]; then
        return 1
    fi
    
    return 0
}

# Save tokens
save_auth_tokens() {
    mkdir -p "$AUTH_CACHE"
    chmod 700 "$AUTH_CACHE"
    
    cat > "$TOKENS_FILE" << EOF
{
  "access_token": "$ACCESS_TOKEN",
  "refresh_token": "$REFRESH_TOKEN",
  "profile_uuid": "$PROFILE_UUID",
  "timestamp": $(date +%s)
}
EOF
    chmod 600 "$TOKENS_FILE"
}

# Refresh access token
refresh_access_token() {
    if ! is_token_expired "$ACCESS_TOKEN"; then
        return 0
    fi
    
    log_step "Refreshing token"
    
    local response
    response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "grant_type=refresh_token" \
        -d "refresh_token=${REFRESH_TOKEN}")
    
    local new_access new_refresh
    new_access=$(echo "$response" | jq -r '.access_token // empty')
    new_refresh=$(echo "$response" | jq -r '.refresh_token // empty')
    
    if [ -z "$new_access" ]; then
        printf "%sfailed%s\n" "${RED}" "${NC}"
        return 1
    fi
    
    ACCESS_TOKEN="$new_access"
    [ -n "$new_refresh" ] && REFRESH_TOKEN="$new_refresh"
    
    save_auth_tokens
    printf "%sdone%s\n" "${GREEN}" "${NC}"
    return 0
}

# Perform OAuth device code flow
perform_device_auth() {
    log_step "Requesting device code"
    
    local device_response
    device_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/device/auth" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "scope=${SCOPE}")
    
    local device_code verification_uri interval expires_in
    device_code=$(echo "$device_response" | jq -r '.device_code')
    verification_uri=$(echo "$device_response" | jq -r '.verification_uri_complete')
    interval=$(echo "$device_response" | jq -r '.interval // 5')
    expires_in=$(echo "$device_response" | jq -r '.expires_in // 900')
    
    if [ -z "$device_code" ] || [ "$device_code" = "null" ]; then
        printf "%sfailed%s\n" "${RED}" "${NC}"
        log_error "Failed to get device code"
        exit 1
    fi
    
    printf "%sdone%s\n" "${GREEN}" "${NC}"
    
    # Display auth URL
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════╗"
    echo "║                         AUTHENTICATION REQUIRED                          ║"
    echo "╠══════════════════════════════════════════════════════════════════════════╣"
    echo "║                                                                          ║"
    echo "║  Visit: $verification_uri"
    echo "║                                                                          ║"
    echo "║  Waiting for authentication (expires in ${expires_in}s)...               ║"
    echo "║                                                                          ║"
    echo "╚══════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    log_step "Waiting for auth"
    
    local elapsed=0
    ACCESS_TOKEN=""
    
    while [ $elapsed -lt $expires_in ]; do
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
                
                if [ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "null" ]; then
                    echo ""
                    printf "%sauthenticated%s\n" "${GREEN}" "${NC}"
                    break
                fi
                ;;
            *)
                echo ""
                printf "%sfailed: %s%s\n" "${RED}" "$error" "${NC}"
                exit 1
                ;;
        esac
    done
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo ""
        printf "%stimed out%s\n" "${RED}" "${NC}"
        exit 1
    fi
    
    # Get profile
    log_step "Fetching profile"
    
    local profiles_response
    profiles_response=$(curl -s -X GET "${ACCOUNT_URL}/my-account/get-profiles" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}")
    
    PROFILE_UUID=$(echo "$profiles_response" | jq -r '.profiles[0].uuid // empty')
    local profile_name
    profile_name=$(echo "$profiles_response" | jq -r '.profiles[0].username // empty')
    
    if [ -z "$PROFILE_UUID" ]; then
        printf "%sno profiles found%s\n" "${RED}" "${NC}"
        exit 1
    fi
    
    printf "%s%s%s\n" "${GREEN}" "$profile_name" "${NC}"
    
    save_auth_tokens
}

# Create game session
create_game_session() {
    log_step "Creating session"
    
    local session_response
    session_response=$(curl -s -X POST "${SESSION_URL}/game-session/new" \
        -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Content-Type: application/json" \
        -d "{\"uuid\": \"${PROFILE_UUID}\"}")
    
    SESSION_TOKEN=$(echo "$session_response" | jq -r '.sessionToken // empty')
    IDENTITY_TOKEN=$(echo "$session_response" | jq -r '.identityToken // empty')
    
    if [ -z "$SESSION_TOKEN" ] || [ "$SESSION_TOKEN" = "null" ]; then
        printf "%sfailed%s\n" "${RED}" "${NC}"
        log_error "Failed to create game session"
        exit 1
    fi
    
    printf "%sdone%s\n" "${GREEN}" "${NC}"
    
    # Export for server args
    export SESSION_TOKEN IDENTITY_TOKEN OWNER_UUID="$PROFILE_UUID"
}

# Main authentication function
authenticate() {
    log_section "Authentication"
    
    # Check for pre-injected tokens (hosting provider mode)
    if [ -n "${HYTALE_SERVER_SESSION_TOKEN:-}" ] && [ -n "${HYTALE_SERVER_IDENTITY_TOKEN:-}" ]; then
        log_step "Token injection"
        SESSION_TOKEN="$HYTALE_SERVER_SESSION_TOKEN"
        IDENTITY_TOKEN="$HYTALE_SERVER_IDENTITY_TOKEN"
        OWNER_UUID="${HYTALE_OWNER_UUID:-}"
        export SESSION_TOKEN IDENTITY_TOKEN OWNER_UUID
        printf "%susing injected tokens%s\n" "${GREEN}" "${NC}"
        return 0
    fi
    
    # Try cached tokens
    if load_cached_tokens; then
        log_step "Loading cached tokens"
        printf "%sfound%s\n" "${GREEN}" "${NC}"
        
        if refresh_access_token; then
            create_game_session
            return 0
        fi
        
        log_warn "Token refresh failed, re-authenticating..."
    fi
    
    # Perform full authentication
    perform_device_auth
    create_game_session
}

export -f authenticate base64url_decode is_token_expired
export -f load_cached_tokens save_auth_tokens refresh_access_token
export -f perform_device_auth create_game_session
