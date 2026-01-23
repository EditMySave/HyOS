#!/bin/bash
# =============================================================================
# Standalone Authentication Initialization
# =============================================================================
# Run this script once to authenticate and save refresh tokens
# Usage: docker compose run --rm auth-init
# =============================================================================

set -euo pipefail

SCRIPTS_DIR="${SCRIPTS_DIR:-/opt/scripts}"
DATA_DIR="${DATA_DIR:-/data}"
AUTH_CACHE="${DATA_DIR}/.auth"
TOKENS_FILE="${AUTH_CACHE}/tokens.json"

# Source utilities
source "${SCRIPTS_DIR}/utils.sh"

OAUTH_URL="https://oauth.accounts.hytale.com"
ACCOUNT_URL="https://account-data.hytale.com"
CLIENT_ID="hytale-server"
SCOPE="openid offline auth:server"

log_separator
log_info "Hytale Server Authentication Setup"
log_separator

# Check for existing tokens
if [ -f "$TOKENS_FILE" ]; then
    log_warn "Tokens already exist at $TOKENS_FILE"
    read -p "Overwrite? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Aborted"
        exit 0
    fi
fi

# Request device code
log_step "Requesting device code"

device_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/device/auth" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "scope=${SCOPE}")

device_code=$(echo "$device_response" | jq -r '.device_code // empty')
verification_uri=$(echo "$device_response" | jq -r '.verification_uri_complete')
interval=$(echo "$device_response" | jq -r '.interval // 5')
expires_in=$(echo "$device_response" | jq -r '.expires_in // 900')

if [ -z "$device_code" ]; then
    printf "%sfailed%s\n" "${RED}" "${NC}"
    log_error "Failed to get device code"
    exit 1
fi

printf "%sdone%s\n" "${GREEN}" "${NC}"

# Display instructions
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                         DEVICE AUTHORIZATION                             ║"
echo "╠══════════════════════════════════════════════════════════════════════════╣"
echo "║                                                                          ║"
echo "║  Visit: $verification_uri"
echo "║                                                                          ║"
echo "║  Waiting for authorization (expires in ${expires_in}s)...                ║"
echo "║                                                                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

# Poll for token
log_step "Waiting for authorization"

elapsed=0
access_token=""

while [ $elapsed -lt $expires_in ]; do
    sleep "$interval"
    elapsed=$((elapsed + interval))
    
    token_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "client_id=${CLIENT_ID}" \
        -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
        -d "device_code=${device_code}")
    
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
            access_token=$(echo "$token_response" | jq -r '.access_token')
            refresh_token=$(echo "$token_response" | jq -r '.refresh_token')
            
            if [ -n "$access_token" ] && [ "$access_token" != "null" ]; then
                echo ""
                printf "%sauthorized%s\n" "${GREEN}" "${NC}"
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

if [ -z "$access_token" ]; then
    echo ""
    printf "%stimed out%s\n" "${RED}" "${NC}"
    exit 1
fi

# Get profile
log_step "Fetching profile"

profiles_response=$(curl -s -X GET "${ACCOUNT_URL}/my-account/get-profiles" \
    -H "Authorization: Bearer ${access_token}")

profile_uuid=$(echo "$profiles_response" | jq -r '.profiles[0].uuid // empty')
profile_name=$(echo "$profiles_response" | jq -r '.profiles[0].username // empty')

if [ -z "$profile_uuid" ]; then
    printf "%sno profiles found%s\n" "${RED}" "${NC}"
    exit 1
fi

printf "%s%s%s\n" "${GREEN}" "$profile_name" "${NC}"

# Save tokens
log_step "Saving tokens"

mkdir -p "$AUTH_CACHE"
chmod 700 "$AUTH_CACHE"

cat > "$TOKENS_FILE" << EOF
{
  "access_token": "$access_token",
  "refresh_token": "$refresh_token",
  "profile_uuid": "$profile_uuid",
  "profile_name": "$profile_name",
  "timestamp": $(date +%s)
}
EOF

chmod 600 "$TOKENS_FILE"
printf "%sdone%s\n" "${GREEN}" "${NC}"

log_separator
log_info "Authentication complete!"
log_info ""
log_info "Saved to: $TOKENS_FILE"
log_info "Profile: $profile_name ($profile_uuid)"
log_info ""
log_info "You can now start the server with:"
log_info "  docker compose up -d hytale"
log_separator
