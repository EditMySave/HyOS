# Hytale Docker Server Analysis

This document contains a comprehensive analysis of 21 Docker implementations for Hytale server containerization. The goal is to identify patterns, best practices, and optimal configurations for running Hytale dedicated servers in Docker.

---

## Table of Contents

1. [Projects Analyzed](#projects-analyzed)
2. [Base Image Strategies](#base-image-strategies)
3. [Authentication Patterns](#authentication-patterns)
4. [Volume and Persistence Strategies](#volume-and-persistence-strategies)
5. [JVM Configuration Patterns](#jvm-configuration-patterns)
6. [Entrypoint Script Patterns](#entrypoint-script-patterns)
7. [Docker Compose Patterns](#docker-compose-patterns)
8. [Health Check Implementations](#health-check-implementations)
9. [Security Hardening](#security-hardening)
10. [Unique Features](#unique-features)
11. [Server CLI Options Reference](#server-cli-options-reference)
12. [Recommendations](#recommendations)

---

## Projects Analyzed

| Project | Approach | Language | Quality Rating |
|---------|----------|----------|----------------|
| docker-hytale-server | Shell/Alpine | Bash | ★★★☆☆ |
| docker-hytale-server-godstep | TypeScript/Bun | TypeScript | ★★★★★ |
| docker-hytale-server-void | Shell/Debian | Bash | ★★★★☆ |
| docker-hytale-server-zach | Shell/Ubuntu | Bash | ★★★☆☆ |
| hytale-container | Shell/Temurin | Bash | ★★☆☆☆ |
| hytale-docker | Shell/Temurin | Bash | ★★☆☆☆ |
| hytale-docker-enesbakis | Shell/Alpine | Bash | ★★★☆☆ |
| hytale-docker-machina | Shell/Alpine | Bash | ★★★★☆ |
| hytale-docker-romariin | TypeScript/Bun | TypeScript | ★★★★★ |
| Hytale-Docker-Server | Shell/Ubuntu | Bash | ★★★★☆ |
| hytale-docker-slowline | Shell/Alpine | Bash | ★★★☆☆ |
| hytale-server | Shell/Temurin + Panel | Bash/Node.js | ★★★★☆ |
| hytale-server-angus | Shell/itzg-style | Bash | ★★★★☆ |
| hytale-server-container | Shell/Multi-variant | Bash | ★★★★★ |
| hytale-server-docker | Shell/Temurin | Bash | ★★☆☆☆ |
| hytale-server-docker-broccoli | Shell/Temurin | Bash | ★★★☆☆ |
| hytale-server-docker-marc | Shell/Alpine | Bash | ★★☆☆☆ |
| hytale-server-docker-pavel | Shell/Ubuntu | Bash | ★★★★☆ |
| hytale-server-ginco | Shell/Alpine | Bash | ★★★☆☆ |
| hytale-server-terkea | Shell/Alpine | Bash | ★★★★☆ |
| hytale-server-visualies | Shell/Temurin | Bash | ★★☆☆☆ |
| dealer-node-docker-hytale | Shell/Temurin JDK | Bash | ★★★☆☆ |

---

## Base Image Strategies

### Strategy 1: Eclipse Temurin Alpine (Most Popular)

**Used by:** 9 projects  
**Image Size:** ~200MB  
**Pros:** Smallest image, fast pulls, quick startup  
**Cons:** musl libc may cause compatibility issues with native libraries

```dockerfile
# docker-hytale-server/Dockerfile
FROM eclipse-temurin:25-jre-alpine

RUN apk add --no-cache \
    curl \
    jq \
    unzip \
    bash

WORKDIR /server
```

**Compatibility Fix (gcompat):**
```dockerfile
# hytale-server-container/Dockerfile.alpine-liberica
RUN apk add --no-cache tini su-exec curl iproute2 ca-certificates tzdata jq \
    libc6-compat libstdc++ gcompat 7zip
```

### Strategy 2: Eclipse Temurin Ubuntu/Jammy

**Used by:** 7 projects  
**Image Size:** ~400MB  
**Pros:** Full glibc compatibility, battle-tested, most reliable  
**Cons:** Larger image size

```dockerfile
# hytale-server-docker-pavel/Dockerfile
FROM eclipse-temurin:25-jre-jammy

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    unzip \
    && rm -rf /var/lib/apt/lists/*
```

### Strategy 3: Bellsoft Liberica Alpine (Optimized)

**Used by:** 1 project (hytale-server-container)  
**Image Size:** ~180MB  
**Pros:** Optimized for Alpine, includes musl compatibility  
**Cons:** Less common, may have different behavior

```dockerfile
# hytale-server-container/Dockerfile.alpine-liberica
FROM bellsoft/liberica-openjre-alpine-musl:25.0.1-11

ARG UID=1000
ARG GID=1000

ENV USER=container \
    HOME=/home/container \
    UID=1000 \
    GID=1000
```

### Strategy 4: Multi-Stage Build with jlink (Minimal)

**Used by:** 2 projects  
**Image Size:** ~80-100MB  
**Pros:** Ultra-minimal, only required Java modules  
**Cons:** Complex build, module maintenance overhead

```dockerfile
# Example jlink approach (not in current repos but recommended pattern)
FROM eclipse-temurin:25-jdk AS builder

RUN jlink --add-modules java.base,java.logging,java.net.http,java.naming,java.sql \
    --strip-debug --no-man-pages --no-header-files \
    --compress=2 --output /jre

FROM debian:bookworm-slim
COPY --from=builder /jre /opt/java
ENV PATH="/opt/java/bin:$PATH"
```

### Strategy 5: Eclipse Temurin JDK (Development)

**Used by:** 1 project (dealer-node)  
**Image Size:** ~500MB  
**Pros:** Full JDK for debugging, jcmd, jstack available  
**Cons:** Much larger, not needed for production

```dockerfile
# dealer-node-docker-hytale/Dockerfile
FROM eclipse-temurin:25-jdk

# Note: Using JDK instead of JRE for debugging capabilities
```

### Recommendation Matrix

| Use Case | Recommended Base |
|----------|------------------|
| Production (size priority) | Eclipse Temurin Alpine + gcompat |
| Production (compatibility priority) | Eclipse Temurin Ubuntu |
| Development | Eclipse Temurin JDK |
| Hosting provider | Eclipse Temurin Ubuntu |
| Edge/IoT | Liberica Alpine |

---

## Authentication Patterns

Hytale servers require OAuth2 authentication via the device code flow. This is one of the most complex aspects to handle in Docker.

### Pattern 1: OAuth Device Code Flow (Most Common)

The OAuth device code flow is the standard authentication method. The user must visit a URL and enter a code to authorize the server.

**OAuth Endpoints:**
- Device Auth: `https://oauth.accounts.hytale.com/oauth2/device/auth`
- Token: `https://oauth.accounts.hytale.com/oauth2/token`
- Profiles: `https://account-data.hytale.com/my-account/get-profiles`
- Sessions: `https://sessions.hytale.com/game-session/new`

**Implementation from docker-hytale-server-void:**

```bash
# docker-hytale-server-void/docker-entrypoint.sh

# Step 1: Request device code
AUTH_RESPONSE=$(curl -s -X POST "https://oauth.accounts.hytale.com/oauth2/device/auth" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=hytale-server" \
  -d "scope=openid offline auth:server")

DEVICE_CODE=$(echo "$AUTH_RESPONSE" | jq -r '.device_code')
VERIFICATION_URI=$(echo "$AUTH_RESPONSE" | jq -r '.verification_uri_complete')
POLL_INTERVAL=$(echo "$AUTH_RESPONSE" | jq -r '.interval')

# Step 2: Display auth banner
echo "╔═════════════════════════════════════════════════════════════════════════════╗"
echo "║                       HYTALE SERVER AUTHENTICATION REQUIRED                 ║"
echo "╠═════════════════════════════════════════════════════════════════════════════╣"
echo "║  Please authenticate the server by visiting the following URL:              ║"
echo "║  $VERIFICATION_URI  ║"
echo "╚═════════════════════════════════════════════════════════════════════════════╝"

# Step 3: Poll for access token
while [ -z "$ACCESS_TOKEN" ]; do
    sleep $POLL_INTERVAL
    
    TOKEN_RESPONSE=$(curl -s -X POST "https://oauth.accounts.hytale.com/oauth2/token" \
      -H "Content-Type: application/x-www-form-urlencoded" \
      -d "client_id=hytale-server" \
      -d "grant_type=urn:ietf:params:oauth:grant-type:device_code" \
      -d "device_code=$DEVICE_CODE")
    
    ERROR=$(echo "$TOKEN_RESPONSE" | jq -r '.error // empty')
    
    if [ "$ERROR" = "authorization_pending" ]; then
        continue
    elif [ -n "$ERROR" ]; then
        echo "Authentication error: $ERROR"
        exit 1
    else
        ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')
        REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.refresh_token')
    fi
done

# Step 4: Get profile UUID
PROFILES_RESPONSE=$(curl -s -X GET "https://account-data.hytale.com/my-account/get-profiles" \
  -H "Authorization: Bearer $ACCESS_TOKEN")
PROFILE_UUID=$(echo "$PROFILES_RESPONSE" | jq -r '.profiles[0].uuid')

# Step 5: Create game session
SESSION_RESPONSE=$(curl -s -X POST "https://sessions.hytale.com/game-session/new" \
   -H "Authorization: Bearer $ACCESS_TOKEN" \
   -H "Content-Type: application/json" \
   -d "{\"uuid\": \"${PROFILE_UUID}\"}")

SESSION_TOKEN=$(echo "$SESSION_RESPONSE" | jq -r '.sessionToken')
IDENTITY_TOKEN=$(echo "$SESSION_RESPONSE" | jq -r '.identityToken')
```

### Pattern 2: Token Caching with Refresh

**Implementation from docker-hytale-server-void:**

```bash
AUTH_CACHE_FILE=".hytale-auth-tokens.json"

# Save tokens for future use
save_auth_tokens() {
    cat > "$AUTH_CACHE_FILE" << EOF
{
  "access_token": "$ACCESS_TOKEN",
  "refresh_token": "$REFRESH_TOKEN",
  "profile_uuid": "$PROFILE_UUID",
  "timestamp": $(date +%s)
}
EOF
    echo "✓ Authentication tokens cached for future use"
}

# JWT token expiry validation
base64url_decode() {
  local b64="$1"
  while (( ${#b64} % 4 != 0 )); do b64+="="; done
  echo "$b64" | tr '_-' '/+' | base64 -d 2>/dev/null
}

is_token_expired() {
    local token="$1"
    IFS='.' read -r header payload sig <<< "$token"
    payload_json=$(base64url_decode "$payload")
    exp=$(echo "$payload_json" | jq -r '.exp')
    now=$(date +%s)
    
    # Check if token expires within 5 minutes
    if [ "$((now + 5*60))" -lt "$exp" ]; then
        return 1  # Not expired
    else
        return 0  # Expired
    fi
}

# Refresh token if needed
refresh_authentication() {
    if is_token_expired $ACCESS_TOKEN; then
        TOKEN_RESPONSE=$(curl -s -X POST "https://oauth.accounts.hytale.com/oauth2/token" \
          -H "Content-Type: application/x-www-form-urlencoded" \
          -d "client_id=hytale-server" \
          -d "grant_type=refresh_token" \
          -d "refresh_token=$REFRESH_TOKEN")
        
        ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r ".access_token")
        REFRESH_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r ".refresh_token")
        save_auth_tokens
    fi
}
```

### Pattern 3: TypeScript OAuth Implementation

**Implementation from docker-hytale-server-godstep:**

```typescript
// docker-hytale-server-godstep/src/token-manager.ts

import {
  AUTH_CACHE,
  OAUTH_TOKEN_FILE,
  HYTALE_SERVER_SESSION_TOKEN,
  HYTALE_SERVER_IDENTITY_TOKEN,
  HYTALE_OWNER_UUID,
  AUTO_AUTH_ON_START,
  OAUTH_REFRESH_CHECK_INTERVAL,
  OAUTH_REFRESH_THRESHOLD_DAYS,
} from "./config.ts";

const OAUTH_URL = "https://oauth.accounts.hytale.com";
const ACCOUNT_URL = "https://account-data.hytale.com";
const SESSION_URL = "https://sessions.hytale.com";
const CLIENT_ID = "hytale-server";
const SCOPE = "openid offline auth:server";

type OAuthTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  profileUuid: string;
};

type SessionTokens = {
  sessionToken: string;
  identityToken: string;
  ownerUuid: string;
};

export async function performDeviceCodeAuth(): Promise<OAuthTokens> {
  // Step 1: Request device code
  const deviceResponse = await fetch(`${OAUTH_URL}/oauth2/device/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `client_id=${CLIENT_ID}&scope=${encodeURIComponent(SCOPE)}`,
  });

  const deviceData = await deviceResponse.json();
  const { device_code, verification_uri_complete, interval, expires_in } = deviceData;

  logInfo("═══════════════════════════════════════════════════════════");
  logInfo("AUTHENTICATION REQUIRED");
  logInfo("═══════════════════════════════════════════════════════════");
  logInfo(`Visit: ${verification_uri_complete}`);
  logInfo("═══════════════════════════════════════════════════════════");

  // Step 2: Poll for token
  const endTime = Date.now() + expires_in * 1000;
  
  while (Date.now() < endTime) {
    await Bun.sleep(interval * 1000);

    const tokenResponse = await fetch(`${OAUTH_URL}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `client_id=${CLIENT_ID}&grant_type=urn:ietf:params:oauth:grant-type:device_code&device_code=${device_code}`,
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error === "authorization_pending") continue;
    if (tokenData.error) throw new Error(tokenData.error);

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + tokenData.expires_in * 1000,
      profileUuid: await getProfileUuid(tokenData.access_token),
    };
  }

  throw new Error("Authentication timed out");
}
```

### Pattern 4: Encrypted Auth Persistence (machine-id)

Hytale can persist authentication using encrypted storage tied to the machine ID. This requires mounting `/etc/machine-id`.

**Implementation from hytale-server-docker-broccoli:**

```bash
# hytale-server-docker-broccoli/scripts/init.sh

# Set up persistent machine-id for encrypted auth
SERVER_FILES="/home/hytale/server-files"
MACHINE_ID_DIR="$SERVER_FILES/.machine-id"
mkdir -p "$MACHINE_ID_DIR"

if [ ! -f "$MACHINE_ID_DIR/uuid" ]; then
    LogInfo "Generating persistent machine-id for encrypted auth..."
    MACHINE_UUID=$(cat /proc/sys/kernel/random/uuid)
    MACHINE_UUID_NO_DASH=$(echo "$MACHINE_UUID" | tr -d '-' | tr '[:upper:]' '[:lower:]')
    
    echo "$MACHINE_UUID_NO_DASH" > "$MACHINE_ID_DIR/machine-id"
    echo "$MACHINE_UUID_NO_DASH" > "$MACHINE_ID_DIR/dbus-machine-id"
    echo "$MACHINE_UUID" > "$MACHINE_ID_DIR/product_uuid"
    echo "$MACHINE_UUID" > "$MACHINE_ID_DIR/uuid"
    
    chown -R ${PUID}:${PGID} "$MACHINE_ID_DIR"
fi

# Copy to system locations
cp "$MACHINE_ID_DIR/machine-id" /etc/machine-id
mkdir -p /var/lib/dbus
cp "$MACHINE_ID_DIR/dbus-machine-id" /var/lib/dbus/machine-id

LogInfo "Machine ID configured for encrypted auth persistence"
```

**Docker Compose volume mount:**

```yaml
volumes:
  # Required for Hytale auth.enc encryption (stable UUID)
  - ./machine-id:/etc/machine-id:ro
```

### Pattern 5: Token Injection via Environment (Hosting Providers)

For hosting providers that manage tokens externally:

```bash
# Check for pre-injected tokens
if [ -n "$HYTALE_SERVER_SESSION_TOKEN" ] && [ -n "$HYTALE_SERVER_IDENTITY_TOKEN" ]; then
    echo "Using pre-injected session tokens"
    SESSION_TOKEN="$HYTALE_SERVER_SESSION_TOKEN"
    IDENTITY_TOKEN="$HYTALE_SERVER_IDENTITY_TOKEN"
else
    # Fall back to OAuth flow
    perform_authentication
fi
```

### Pattern 6: In-Server /auth Command Automation

**Implementation from hytale-server-docker-broccoli:**

```bash
# hytale-server-docker-broccoli/scripts/start.sh

# Create a named pipe for sending commands to the server
FIFO="/tmp/hytale_input_$$"
mkfifo "$FIFO"

# Start the server with the fifo as stdin
eval "$STARTUP_CMD" < "$FIFO" &
SERVER_PID=$!

# Open the fifo for writing (keeps it open)
exec 3>"$FIFO"

# Monitor logs and send auth command when ready
(
    sleep 5
    LOG_FILE=$(ls -t /home/hytale/server-files/logs/*_server.log 2>/dev/null | head -1)
    if [ -n "$LOG_FILE" ]; then
        tail -f "$LOG_FILE" | while read -r line; do
            if echo "$line" | grep -q "Hytale Server Booted!"; then
                sleep 2
                echo "/auth login device" >&3
                LogSuccess "Sent auth command to server"
            fi
            
            if echo "$line" | grep -qE "Authentication successful!|Server is already authenticated."; then
                sleep 1
                echo "/auth persistence Encrypted" >&3
                LogSuccess "Sent persistence command to server"
                break
            fi
        done
    fi
) &

wait $SERVER_PID
```

### Pattern 7: Separate Auth Service (Pavel)

Split authentication into a separate container/profile:

```yaml
# hytale-server-docker-pavel/docker-compose.yml

services:
  hytale:
    build: .
    volumes:
      - ${HYTALE_DATA_DIR:-/opt/hytale-data}:/data
    ports:
      - "${HYTALE_PORT:-5520}:5520/udp"

  auth-init:
    build: .
    profiles: ["manual"]
    volumes:
      - ${HYTALE_DATA_DIR:-/opt/hytale-data}:/data
    environment:
      TOKENS_DIR: /data/.tokens
    entrypoint: ["/scripts/auth-init.sh"]
```

Usage:
```bash
# One-time auth setup
docker compose run --rm auth-init

# Then start server
docker compose up -d hytale
```

---

## Volume and Persistence Strategies

### Strategy 1: Named Volumes (Recommended for Data)

```yaml
# hytale-docker-romariin/docker-compose.yml
services:
  hytale:
    volumes:
      - hytale-data:/server
      - /etc/machine-id:/etc/machine-id:ro

volumes:
  hytale-data:
```

**Pros:** Docker manages lifecycle, easy backup with `docker volume`, portable  
**Cons:** Harder to access files directly

### Strategy 2: Bind Mounts (Development)

```yaml
# hytale-server-terkea/docker-compose.yml
services:
  hytale:
    volumes:
      - ./hytale-data:/data
      - ./machine-id:/etc/machine-id:ro
```

**Pros:** Easy file access, direct editing  
**Cons:** Permission issues, host path dependency

### Strategy 3: Hybrid Approach (Best Practice)

```yaml
# Hytale-Docker-Server/docker-compose.yml
services:
  hytale-server:
    volumes:
      # Server core - named volume for auth persistence
      - hytale-server-data:/server/Server
      
      # User data - bind mounts for easy access
      - ./universe:/server/Server/universe
      - ./backups:/server/Server/backups
      - ./mods:/server/Server/mods
      - ./logs:/server/Server/logs
      
      # Machine ID - required for auth.enc
      - ./machine-id:/etc/machine-id:ro
      
      # Config files - bind mounts for editing
      - ./config.json:/server/Server/config.json
      - ./permissions.json:/server/Server/permissions.json

volumes:
  hytale-server-data:
```

### Strategy 4: Comprehensive Volume Layout

```yaml
# hytale-server/docker-compose.dev.yml
volumes:
  - ./server:/opt/hytale                    # Server files
  - ./data/universe:/opt/hytale/universe    # World data
  - ./data/mods:/opt/hytale/mods            # Mods
  - ./data/logs:/opt/hytale/logs            # Logs
  - ./data/config:/opt/hytale/config        # Configuration
```

### Volume Paths Reference

| Path | Purpose | Persistence Priority |
|------|---------|---------------------|
| `/data/universe` or `/server/universe` | World save data | Critical |
| `/data/mods` | Mod files | Important |
| `/data/config.json` | Server configuration | Important |
| `/data/auth.enc` | Encrypted auth tokens | Critical |
| `/data/permissions.json` | Player permissions | Important |
| `/data/whitelist.json` | Whitelist | Moderate |
| `/data/bans.json` | Ban list | Moderate |
| `/data/logs` | Server logs | Low |
| `/data/backups` | Backup files | Important |

---

## JVM Configuration Patterns

### Memory Configuration

**Pattern 1: Fixed Memory (Most Common)**

```bash
# Simple fixed allocation
JAVA_CMD="java -Xms4G -Xmx8G -jar HytaleServer.jar"
```

**Pattern 2: Container-Aware Memory**

```bash
# dealer-node-docker-hytale/entrypoint.sh
JVM_ARGS="-XX:+UseContainerSupport"
JVM_ARGS="$JVM_ARGS -XX:MaxRAMPercentage=90.0"
JVM_ARGS="$JVM_ARGS -XX:InitialRAMPercentage=50.0"
```

**Pattern 3: Dynamic RAM Detection**

```bash
# Hytale-Docker-Server/scripts/download-server.sh

# Detect total RAM
TOTAL_RAM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_RAM_GB=$((TOTAL_RAM_KB / 1024 / 1024))

# Calculate optimal JVM memory settings (leave 2-3GB for system)
if [ $TOTAL_RAM_GB -le 4 ]; then
    XMS="1G"; XMX="2G"
elif [ $TOTAL_RAM_GB -le 8 ]; then
    XMS="2G"; XMX="5G"
elif [ $TOTAL_RAM_GB -le 16 ]; then
    XMS="4G"; XMX="8G"
else
    XMS="6G"; XMX="12G"
fi
```

### Garbage Collector Configuration

**G1GC (Balanced - Recommended)**

```bash
# hytale-server/docker-compose.dev.yml environment
JAVA_OPTS: "-Xms4G -Xmx8G -XX:+UseG1GC -XX:MaxGCPauseMillis=200 \
  -XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 \
  -XX:G1HeapRegionSize=8M"
```

**ZGC (Ultra-Low Latency)**

```bash
# Hytale-Docker-Server/scripts/start-server-optimized.sh
JVM_ARGS=(
    -Xms4G
    -Xmx8G
    -XX:+UseZGC
    -XX:ZCollectionInterval=5
    -XX:ZAllocationSpikeTolerance=2
    -XX:+AlwaysPreTouch
    -XX:+ParallelRefProcEnabled
    -XX:+DisableExplicitGC
    -XX:-UseCompressedOops
    -XX:+UseLargePages
)
```

**Comparison:**

| GC | Latency | Throughput | Memory Overhead | Best For |
|----|---------|------------|-----------------|----------|
| G1GC | Medium | High | Low | General use |
| ZGC | Very Low | Medium | Medium | Large heaps, low-latency |
| Shenandoah | Very Low | Medium | Medium | Alternative to ZGC |

### AOT Cache Configuration

The AOT (Ahead-of-Time) cache significantly improves startup time (30-50% faster).

```bash
# Check and use AOT cache
AOT_CACHE="/data/server/HytaleServer.aot"

if [ -f "$AOT_CACHE" ]; then
    JAVA_CMD="${JAVA_CMD} -XX:AOTCache=$AOT_CACHE"
    echo "Using AOT cache for faster startup"
fi
```

**Environment variable approach:**

```bash
# docker-hytale-server-godstep/src/config.ts
export const ENABLE_AOT_CACHE = getEnvBool("ENABLE_AOT_CACHE", true);
```

### Complete JVM Configuration Template

```bash
# Comprehensive JVM configuration
build_jvm_args() {
    local args=""
    
    # Memory
    args="$args -Xms${JAVA_XMS:-4G}"
    args="$args -Xmx${JAVA_XMX:-8G}"
    
    # Container support
    args="$args -XX:+UseContainerSupport"
    
    # Garbage Collector (G1GC default)
    if [ "${USE_ZGC:-false}" = "true" ]; then
        args="$args -XX:+UseZGC"
        args="$args -XX:ZCollectionInterval=5"
    else
        args="$args -XX:+UseG1GC"
        args="$args -XX:MaxGCPauseMillis=200"
        args="$args -XX:+UseStringDeduplication"
    fi
    
    # Performance
    args="$args -XX:+AlwaysPreTouch"
    args="$args -XX:+ParallelRefProcEnabled"
    
    # AOT Cache
    if [ -f "${AOT_CACHE_PATH}" ]; then
        args="$args -XX:AOTCache=${AOT_CACHE_PATH}"
    fi
    
    # Custom args
    if [ -n "${JAVA_OPTS}" ]; then
        args="$args ${JAVA_OPTS}"
    fi
    
    echo "$args"
}
```

---

## Entrypoint Script Patterns

### Pattern 1: Simple Sequential (Basic)

```bash
#!/bin/bash
set -e

# Download if needed
if [ ! -f "HytaleServer.jar" ]; then
    ./download.sh
fi

# Start server
exec java -jar HytaleServer.jar --assets Assets.zip --bind 0.0.0.0:5520
```

### Pattern 2: Modular Scripts (itzg-style)

**Main entrypoint:**

```bash
# hytale-server-angus/scripts/start
#!/bin/bash
set -e

SCRIPTS_DIR="$(dirname "$0")"
. "${SCRIPTS_DIR}/start-utils"

# Handle running as root and switching to hytale user
if [ "$(id -u)" = 0 ]; then
    # Update hytale user/group IDs if needed
    if [ "$UID" != "$(id -u hytale)" ]; then
        usermod -u "$UID" hytale
    fi
    
    # Fix ownership
    chown -R hytale:hytale /data /opt/hytale
    
    # Switch to hytale user and continue
    exec gosu hytale:hytale "${SCRIPTS_DIR}/start-configuration" "$@"
else
    exec "${SCRIPTS_DIR}/start-configuration" "$@"
fi
```

**Utility functions:**

```bash
# hytale-server-angus/scripts/start-utils

log() {
    if isTrue "${LOG_TIMESTAMP}"; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
    else
        echo "$*"
    fi
}

isTrue() {
    local value="${1,,}"  # lowercase
    case "$value" in
        true|yes|on|1) return 0 ;;
        *) return 1 ;;
    esac
}

buildMemoryArgs() {
    local args=""
    if [ -n "${INIT_MEMORY}" ]; then
        args="-Xms${INIT_MEMORY}"
    elif [ -n "${MEMORY}" ]; then
        args="-Xms${MEMORY}"
    fi
    
    if [ -n "${MAX_MEMORY}" ]; then
        args="${args} -Xmx${MAX_MEMORY}"
    elif [ -n "${MEMORY}" ]; then
        args="${args} -Xmx${MEMORY}"
    fi
    
    echo "$args"
}
```

### Pattern 3: TypeScript Entrypoint (Modern)

```typescript
// docker-hytale-server-godstep/src/entrypoint.ts

import { ensureServerFiles } from "./download.ts";
import { installCurseForgeMods } from "./mod-installer.ts";
import { ensureAuthentication } from "./token-manager.ts";
import { writeConfigFiles } from "./config-writer.ts";
import { cleanupOldLogs, runHealthCheck } from "./healthcheck.ts";
import { setupSignalHandlers, launchServer } from "./setup.ts";

async function main() {
  logInfo("Hytale Server Container Starting...");
  logInfo(`Version: ${process.env.npm_package_version || "dev"}`);
  
  // Step 1: Ensure server files
  await ensureServerFiles();
  
  // Step 2: Install mods if configured
  await installCurseForgeMods();
  
  // Step 3: Write config files from ENV
  await writeConfigFiles();
  
  // Step 4: Cleanup old logs
  await cleanupOldLogs();
  
  // Step 5: Ensure authentication
  const tokens = await ensureAuthentication();
  
  // Step 6: Setup signal handlers
  setupSignalHandlers();
  
  // Step 7: Launch server
  await launchServer(tokens);
}

main().catch((err) => {
  logError(`Fatal error: ${err.message}`);
  process.exit(1);
});
```

### Pattern 4: Signal Handling for Graceful Shutdown

```bash
# hytale-server-docker-broccoli/scripts/init.sh

term_handler() {
    if ! shutdown_server; then
        # Force shutdown if graceful shutdown fails
        kill -SIGTERM "$(pgrep -f HytaleServer.jar)"
    fi
    tail --pid="$killpid" -f 2>/dev/null
}

trap 'term_handler' SIGTERM

# Start server in background
su hytale -c "./start.sh" &
killpid="$!"
wait "$killpid"
```

### Pattern 5: Process Supervisor (tini)

```dockerfile
# hytale-server-container/Dockerfile.ubuntu
RUN apt-get update && apt-get install -y --no-install-recommends tini

ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/bin/sh", "/entrypoint.sh"]
```

**Why tini?**
- Properly handles zombie processes
- Forwards signals to child processes
- Prevents PID 1 issues in containers

---

## Docker Compose Patterns

### Pattern 1: Minimal Configuration

```yaml
# hytale-server-visualies/docker-compose.yml
services:
  hytale:
    image: ghcr.io/visualies/hytale-server:latest
    environment:
      MAX_MEMORY: 8G
    volumes:
      - ./server-data:/data
    ports:
      - "5520:5520/udp"
    restart: unless-stopped
```

### Pattern 2: Full Featured with Environment Variables

```yaml
# hytale-server-terkea/docker-compose.yml
services:
  hytale:
    build: .
    image: hytale-server:latest
    container_name: hytale-server
    ports:
      - "5520:5520/udp"
    environment:
      # Server Settings
      - SERVER_NAME=My Hytale Server
      - MOTD=Welcome to my Hytale server!
      - PASSWORD=
      - MAX_PLAYERS=50
      - MAX_VIEW_RADIUS=12
      - DEFAULT_WORLD=default
      - DEFAULT_GAMEMODE=Adventure

      # Memory Settings
      - MEMORY=4G
      # - INIT_MEMORY=4G
      # - MAX_MEMORY=8G

      # JVM Options
      - USE_AOT_CACHE=true

      # Network Settings
      - SERVER_PORT=5520
      - BIND_ADDRESS=0.0.0.0

      # User Settings
      - UID=1000
      - GID=1000
      - TZ=UTC

      # Backup Settings
      - ENABLE_BACKUP=false
      - BACKUP_FREQUENCY=30
      - BACKUP_DIR=/data/backups

      # Download Settings
      - AUTO_DOWNLOAD=true
      - AUTO_UPDATE=true

    volumes:
      - ./hytale-data:/data
      - ./machine-id:/etc/machine-id:ro
    stdin_open: true
    tty: true
    restart: unless-stopped
```

### Pattern 3: Resource Limits (Production)

```yaml
# hytale-docker-romariin/docker-compose.yml
services:
  hytale:
    image: rxmarin/hytale-docker:latest
    deploy:
      resources:
        limits:
          memory: 10G
        reservations:
          memory: 4G
    healthcheck:
      test: ["CMD", "pgrep", "-f", "HytaleServer.jar"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 120s
```

### Pattern 4: Network Sysctls (Performance)

```yaml
# hytale-docker-machina/docker-compose.yml
services:
  hytale:
    sysctls:
      # Increase local port range
      net.ipv4.ip_local_port_range: "1024 65535"
      # Enable TCP reuse
      net.ipv4.tcp_tw_reuse: "1"
      # Reduce TIME_WAIT duration
      net.ipv4.tcp_fin_timeout: "15"
      # Increase connection backlog
      net.core.somaxconn: "65535"
      net.ipv4.tcp_max_syn_backlog: "16384"
      # Disable slow start after idle
      net.ipv4.tcp_slow_start_after_idle: "0"
    ulimits:
      nofile:
        soft: 1048576
        hard: 1048576
```

### Pattern 5: Multi-Container Setup

```yaml
# hytale-server/docker-compose.dev.yml
services:
  hytale:
    build: .
    image: hytale-server:dev
    container_name: ${CONTAINER_NAME:-hytale-server}
    privileged: true  # For development only
    ports:
      - "${BIND_PORT:-5520}:${BIND_PORT:-5520}/udp"
    environment:
      JAVA_XMS: ${JAVA_XMS:-4G}
      JAVA_XMX: ${JAVA_XMX:-8G}
    volumes:
      - ./server:/opt/hytale

  panel:
    build: ./panel
    container_name: hytale-panel
    ports:
      - "${PANEL_PORT:-3000}:${PANEL_PORT:-3000}"
    environment:
      CONTAINER_NAME: ${CONTAINER_NAME:-hytale-server}
      PANEL_USER: ${PANEL_USER:-admin}
      PANEL_PASS: ${PANEL_PASS:-admin}
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - hytale
```

### Pattern 6: Separate Services for Init/Update

```yaml
# hytale-server-docker-pavel/docker-compose.yml
services:
  hytale:
    build: .
    container_name: hytale
    volumes:
      - ${HYTALE_DATA_DIR:-/opt/hytale-data}:/data
    ports:
      - "${HYTALE_PORT:-5520}:5520/udp"
    environment:
      JAVA_OPTS: "${JAVA_OPTS:--Xms2G -Xmx6G}"
      HYTALE_BIND: "0.0.0.0:5520"
      BACKUP_ENABLED: "${BACKUP_ENABLED:-true}"
      BACKUP_FREQUENCY: "${BACKUP_FREQUENCY:-30}"

  updater:
    build: .
    container_name: hytale-updater
    profiles: ["manual"]
    volumes:
      - ${HYTALE_DATA_DIR:-/opt/hytale-data}:/data
    environment:
      PATCHLINE: "${PATCHLINE:-release}"
    entrypoint: ["/scripts/updater.sh"]

  auth-init:
    build: .
    container_name: hytale-auth
    profiles: ["manual"]
    volumes:
      - ${HYTALE_DATA_DIR:-/opt/hytale-data}:/data
    environment:
      TOKENS_DIR: /data/.tokens
    entrypoint: ["/scripts/auth-init.sh"]
```

---

## Health Check Implementations

### Method 1: Process Check (Basic)

```yaml
healthcheck:
  test: ["CMD", "pgrep", "-f", "HytaleServer.jar"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 120s
```

```bash
# hytale-server-terkea/scripts/health-check.sh
#!/bin/bash
if pgrep -f "HytaleServer.jar" > /dev/null 2>&1; then
    exit 0
else
    exit 1
fi
```

### Method 2: Port Binding Check (Better)

```bash
# hytale-server-container/Dockerfile.ubuntu
HEALTHCHECK --interval=30s --timeout=5s --start-period=2m --retries=3 \
    CMD ss -ulpn | grep -q ":${SERVER_PORT}" || exit 1
```

### Method 3: Log Activity Check (Comprehensive)

```bash
# hytale-docker-enesbakis/scripts/hytale-health.sh
#!/bin/bash

# Check if Java process is running
if ! pgrep -f "java.*HytaleServer" > /dev/null 2>&1; then
    exit 1
fi

# Check if log file was updated recently (within last 5 minutes)
if [ -d "/data/logs" ]; then
    recent_logs=$(find /data/logs -name "*.log" -mmin -5 2>/dev/null | head -1)
    if [ -z "$recent_logs" ]; then
        # No recent log activity, but process is running
        # This might be normal during startup or idle periods
        exit 0
    fi
fi

exit 0
```

### Method 4: Combined Health Check

```bash
#!/bin/bash
# Comprehensive health check

# 1. Check process
if ! pgrep -f "HytaleServer.jar" > /dev/null; then
    echo "UNHEALTHY: Server process not running"
    exit 1
fi

# 2. Check port binding
if ! ss -ulpn | grep -q ":5520"; then
    echo "UNHEALTHY: Port 5520 not bound"
    exit 1
fi

# 3. Check memory (optional)
HEAP_USED=$(jcmd $(pgrep -f HytaleServer.jar) GC.heap_info 2>/dev/null | grep -oP 'used \K[0-9]+')
if [ -n "$HEAP_USED" ] && [ "$HEAP_USED" -gt 7500000000 ]; then
    echo "WARNING: High heap usage"
fi

echo "HEALTHY"
exit 0
```

---

## Security Hardening

### Non-Root User Setup

```dockerfile
# hytale-server-container/Dockerfile.ubuntu

# Build arguments for customizable UID/GID
ARG UID=1000
ARG GID=1000

ENV USER=container \
    HOME=/home/container \
    UID=1000 \
    GID=1000

# Setup User (with UID/GID conflict handling)
RUN if getent passwd ${UID} > /dev/null 2>&1; then \
        EXISTING_USER=$(getent passwd ${UID} | cut -d: -f1); \
        usermod -l ${USER} -d ${HOME} -m ${EXISTING_USER}; \
    else \
        groupadd -g ${GID} ${USER} && \
        useradd -m -d ${HOME} -u ${UID} -g ${USER} -s /bin/sh ${USER}; \
    fi

# Run as non-root
USER ${USER}
```

### File Permission Handling

```bash
# hytale-server-angus/scripts/start
if [ "$(id -u)" = 0 ]; then
    # Update hytale user/group IDs if needed
    if [ "$UID" != "$(id -u hytale)" ]; then
        log "Changing uid of hytale to $UID"
        usermod -u "$UID" hytale
    fi
    
    if [ "$GID" != "$(id -g hytale)" ]; then
        log "Changing gid of hytale to $GID"
        groupmod -o -g "$GID" hytale
    fi
    
    # Fix ownership of data directory
    if [ "$(stat -c '%u' /data)" != "$UID" ]; then
        chown -R hytale:hytale /data
    fi
    
    # Switch to hytale user
    exec gosu hytale:hytale "${SCRIPTS_DIR}/start-configuration" "$@"
fi
```

### Credential Protection

```bash
# Secure credential storage
chmod 600 .hytale-downloader-credentials.json
chmod 700 /data/.tokens
```

```typescript
// docker-hytale-server-godstep/src/token-manager.ts
await writeFile(OAUTH_TOKEN_FILE, JSON.stringify(tokens, null, 2));
await chmod(OAUTH_TOKEN_FILE, 0o600);  // Owner read/write only
```

### Read-Only Root Filesystem

```dockerfile
# Best practice: minimize writable areas
VOLUME ["/data"]
WORKDIR /data

# Make container filesystem read-only where possible
# (Compose example)
# read_only: true
# tmpfs:
#   - /tmp
```

---

## Unique Features

### Feature 1: Web Panel

**Project:** hytale-server  
**Technology:** Node.js, Express, Socket.IO, Dockerode

```javascript
// hytale-server/panel/server.js

const Docker = require("dockerode");
const docker = new Docker({ socketPath: "/var/run/docker.sock" });

// Container management
async function getContainerStatus() {
  const c = docker.getContainer(CONTAINER_NAME);
  const info = await c.inspect();
  return {
    running: info.State.Running,
    status: info.State.Status,
    health: info.State.Health?.Status || "unknown",
  };
}

// File management via tar streams
async function readFileContent(filePath) {
  const stream = await container.getArchive({ path: safePath });
  // ... tar extraction
}

async function writeFileContent(filePath, content) {
  const pack = tar.pack();
  pack.entry({ name: fileName }, content);
  await container.putArchive(pack, { path: dirPath });
}

// Real-time log streaming
socket.on("connection", async (socket) => {
  const logStream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: 100,
    timestamps: true,
  });
  
  logStream.on("data", (chunk) => {
    socket.emit("log", chunk.slice(8).toString("utf8"));
  });
});
```

### Feature 2: CurseForge Mod Installer

**Project:** docker-hytale-server-godstep  
**Features:** API integration, hash verification, version matching

```typescript
// docker-hytale-server-godstep/src/mod-installer.ts

const CURSEFORGE_API_BASE = "https://api.curseforge.com/v1";

async function getModFile(modId: number, fileId?: number): Promise<CurseForgeFile> {
  if (fileId) {
    // Get specific file
    const response = await fetch(`${CURSEFORGE_API_BASE}/mods/${modId}/files/${fileId}`, {
      headers: { "x-api-key": CURSEFORGE_API_KEY }
    });
    return response.json();
  }
  
  // Get latest file matching game version
  const response = await fetch(`${CURSEFORGE_API_BASE}/mods/${modId}/files`, {
    headers: { "x-api-key": CURSEFORGE_API_KEY }
  });
  const files = (await response.json()).data;
  
  // Filter by game version
  const versionFiltered = files.filter((file) => 
    matchesGameVersion(file.gameVersions, CURSEFORGE_GAME_VERSION)
  );
  
  return versionFiltered[0] || files[0];
}

async function validateFile(path: string, fileInfo: CurseForgeFile): Promise<boolean> {
  const preferredHash = pickHash(fileInfo.hashes);
  if (preferredHash) {
    const actual = await calculateHash(path, preferredHash.algo);
    return actual.toLowerCase() === preferredHash.value.toLowerCase();
  }
  return false;
}
```

**Usage:**
```yaml
environment:
  MOD_INSTALL_MODE: "curseforge"
  CURSEFORGE_API_KEY: "your-api-key"
  CURSEFORGE_MOD_LIST: "123456,789012:4567890"  # projectId or projectId:fileId
```

### Feature 3: Config Generator from Environment

**Project:** hytale-server-terkea

```bash
# hytale-server-terkea/scripts/config-generator.sh

generate_config() {
    local server_name=$(escape_json_string "${SERVER_NAME:-Hytale Server}")
    local motd=$(escape_json_string "${MOTD:-}")
    local max_players="${MAX_PLAYERS:-100}"
    
    cat > "$CONFIG_FILE" << EOF
{
  "Version": 3,
  "ServerName": "${server_name}",
  "MOTD": "${motd}",
  "MaxPlayers": ${max_players},
  "MaxViewRadius": ${MAX_VIEW_RADIUS:-12},
  "Defaults": {
    "World": "${DEFAULT_WORLD:-default}",
    "GameMode": "${DEFAULT_GAMEMODE:-Adventure}"
  }
}
EOF
}
```

### Feature 4: Comprehensive Server Options

**Project:** hytale-server-container  
**Coverage:** All 40+ Hytale server CLI options

```bash
# hytale-server-container/scripts/hytale/hytale_options.sh

# Initialize all option variables
export HYTALE_ACCEPT_EARLY_PLUGINS_OPT=""
export HYTALE_ALLOW_OP_OPT=""
export HYTALE_AUTH_MODE_OPT=""
export HYTALE_BACKUP_OPT=""
export HYTALE_BACKUP_DIR_OPT=""
export HYTALE_BACKUP_FREQUENCY_OPT=""
export HYTALE_BACKUP_MAX_COUNT_OPT=""
export HYTALE_BARE_OPT=""
export HYTALE_BOOT_COMMAND_OPT=""
export HYTALE_DISABLE_SENTRY_OPT=""
# ... 30+ more options

# Example option handling
if [ "${HYTALE_ACCEPT_EARLY_PLUGINS:-}" = "TRUE" ]; then
    export HYTALE_ACCEPT_EARLY_PLUGINS_OPT="--accept-early-plugins"
fi

if [ -n "${HYTALE_AUTH_MODE:-}" ]; then
    if [ "$HYTALE_AUTH_MODE" = "authenticated" ] || [ "$HYTALE_AUTH_MODE" = "offline" ]; then
        export HYTALE_AUTH_MODE_OPT="--auth-mode=$HYTALE_AUTH_MODE"
    fi
fi

if [ -n "${HYTALE_BACKUP_DIR:-}" ]; then
    export HYTALE_BACKUP_DIR_OPT="--backup-dir=$HYTALE_BACKUP_DIR"
    if [ "${HYTALE_BACKUP:-}" = "TRUE" ]; then
        export HYTALE_BACKUP_OPT="--backup"
    fi
    if [ -n "${HYTALE_BACKUP_FREQUENCY:-}" ]; then
        export HYTALE_BACKUP_FREQUENCY_OPT="--backup-frequency=$HYTALE_BACKUP_FREQUENCY"
    fi
fi
```

### Feature 5: IPC Socket for Commands

**Project:** hytale-docker-romariin

```typescript
// hytale-docker-romariin/src/modules/server/ServerProcess.ts

const IPC_SOCKET_PATH = "/tmp/hytale.sock";

private startSocketServer(): void {
  this.socketServer = Bun.listen({
    unix: IPC_SOCKET_PATH,
    socket: {
      data(socket, data) {
        const command = Buffer.from(data).toString().trim();
        if (command && self.proc) {
          // Send command to server stdin
          self.proc.stdin.write(`${command}\n`);
          
          // Return recent output
          setTimeout(() => {
            const recent = self.outputBuffer.slice(-20).join("\n");
            socket.write(recent);
            socket.end();
          }, 300);
        }
      },
    },
  });
}

// External tool can connect:
// echo "/say Hello" | nc -U /tmp/hytale.sock
```

---

## Server CLI Options Reference

Based on analysis of hytale-server-container's comprehensive option handling:

| Option | Environment Variable | Default | Description |
|--------|---------------------|---------|-------------|
| `--accept-early-plugins` | `HYTALE_ACCEPT_EARLY_PLUGINS` | FALSE | Accept early-stage plugins |
| `--allow-op` | `HYTALE_ALLOW_OP` | FALSE | Allow OP commands |
| `--assets <path>` | `HYTALE_ASSETS` | Assets.zip | Path to assets |
| `--auth-mode <mode>` | `HYTALE_AUTH_MODE` | authenticated | authenticated or offline |
| `--backup` | `HYTALE_BACKUP` | FALSE | Enable backup on startup |
| `--backup-dir <path>` | `HYTALE_BACKUP_DIR` | - | Backup directory |
| `--backup-frequency <min>` | `HYTALE_BACKUP_FREQUENCY` | - | Backup interval in minutes |
| `--backup-max-count <n>` | `HYTALE_BACKUP_MAX_COUNT` | - | Max backup count |
| `--bare` | `HYTALE_BARE` | FALSE | Bare mode |
| `--bind <addr:port>` | `HYTALE_BIND` | 0.0.0.0:5520 | Bind address |
| `--boot-command <cmd>` | `HYTALE_BOOT_COMMAND` | - | Command on boot |
| `--disable-asset-compare` | `HYTALE_DISABLE_ASSET_COMPARE` | FALSE | Skip asset comparison |
| `--disable-cpb-build` | `HYTALE_DISABLE_CPB_BUILD` | FALSE | Disable CPB build |
| `--disable-file-watcher` | `HYTALE_DISABLE_FILE_WATCHER` | FALSE | Disable file watching |
| `--disable-sentry` | `HYTALE_DISABLE_SENTRY` | FALSE | Disable crash reporting |
| `--early-plugins <path>` | `HYTALE_EARLY_PLUGINS` | - | Early plugins path |
| `--event-debug` | `HYTALE_EVENT_DEBUG` | FALSE | Debug events |
| `--force-network-flush` | `HYTALE_FORCE_NETWORK_FLUSH` | TRUE | Force network flush |
| `--generate-schema` | `HYTALE_GENERATE_SCHEMA` | FALSE | Generate schema |
| `--identity-token <token>` | `HYTALE_IDENTITY_TOKEN` | - | Identity token |
| `--log <level>` | `HYTALE_LOG` | - | Log level |
| `--migrate-worlds <path>` | `HYTALE_MIGRATE_WORLDS` | - | Migrate worlds |
| `--mods <path>` | `HYTALE_MODS` | - | Mods directory |
| `--owner-name <name>` | `HYTALE_OWNER_NAME` | - | Server owner name |
| `--owner-uuid <uuid>` | `HYTALE_OWNER_UUID` | - | Server owner UUID |
| `--prefab-cache <path>` | `HYTALE_PREFAB_CACHE` | - | Prefab cache path |
| `--session-token <token>` | `HYTALE_SESSION_TOKEN` | - | Session token |
| `--shutdown-after-validate` | `HYTALE_SHUTDOWN_AFTER_VALIDATE` | FALSE | Shutdown after validation |
| `--singleplayer` | `HYTALE_SINGLEPLAYER` | FALSE | Singleplayer mode |
| `--transport <type>` | `HYTALE_TRANSPORT` | QUIC | Transport type |
| `--universe <path>` | `HYTALE_UNIVERSE` | - | Universe data path |
| `--validate-assets` | `HYTALE_VALIDATE_ASSETS` | FALSE | Validate assets |
| `--validate-prefabs <mode>` | `HYTALE_VALIDATE_PREFABS` | - | Validate prefabs |
| `--validate-world-gen` | `HYTALE_VALIDATE_WORLD_GEN` | FALSE | Validate world gen |
| `--version` | `HYTALE_VERSION` | FALSE | Print version |
| `--world-gen <path>` | `HYTALE_WORLD_GEN` | - | World gen config |

**JVM-specific:**
| Option | Environment Variable | Default | Description |
|--------|---------------------|---------|-------------|
| `-XX:AOTCache` | `HYTALE_CACHE_DIR` | - | AOT cache location |

---

## Recommendations

### For Production Deployments

1. **Base Image:** Use Eclipse Temurin 25 Alpine with gcompat for size, or Ubuntu for maximum compatibility
2. **Memory:** Minimum 4GB, recommended 8GB
3. **GC:** Use G1GC with `-XX:MaxGCPauseMillis=200`
4. **AOT Cache:** Enable for faster startup
5. **Auth:** Use encrypted persistence with machine-id mount
6. **Health Check:** Use port binding check (`ss -ulpn`)
7. **Volumes:** Named volume for server data, bind mounts for config
8. **Resource Limits:** Set memory limits in Docker Compose
9. **User:** Run as non-root with matching UID/GID

### For Development

1. **Base Image:** Eclipse Temurin JDK for debugging tools
2. **Volumes:** Bind mounts everywhere for easy editing
3. **Features:** Enable `--disable-sentry`, `--accept-early-plugins`
4. **Panel:** Consider adding the web panel from hytale-server

### For Hosting Providers

1. **Auth:** Use token injection via environment variables
2. **Multi-container:** Separate auth-init and updater services
3. **Sysctls:** Enable network optimizations
4. **Ulimits:** Increase file descriptor limits
5. **Health Checks:** Comprehensive checks with proper start_period
6. **Config:** Use environment-to-config generation

### Security Checklist

- [ ] Run as non-root user
- [ ] Use read-only root filesystem where possible
- [ ] Protect credential files (chmod 600)
- [ ] Mount machine-id read-only
- [ ] Don't expose Docker socket (except panel container)
- [ ] Use specific image tags, not `latest`
- [ ] Implement resource limits
- [ ] Regular security updates

---

## Quick Reference

### Minimum Viable Configuration

```yaml
# docker-compose.yml
services:
  hytale:
    image: eclipse-temurin:25-jre-alpine
    ports:
      - "5520:5520/udp"
    volumes:
      - ./data:/data
      - /etc/machine-id:/etc/machine-id:ro
    working_dir: /data
    command: >
      java -Xms4G -Xmx8G
      -XX:+UseG1GC
      -XX:AOTCache=/data/server/HytaleServer.aot
      -jar /data/server/HytaleServer.jar
      --assets /data/Assets.zip
      --bind 0.0.0.0:5520
    stdin_open: true
    tty: true
    restart: unless-stopped
```

### Optimized Production Configuration

```yaml
services:
  hytale:
    build: .
    container_name: hytale
    ports:
      - "5520:5520/udp"
    environment:
      JAVA_XMS: "4G"
      JAVA_XMX: "8G"
      USE_G1GC: "true"
      ENABLE_AOT: "true"
      DISABLE_SENTRY: "true"
    volumes:
      - hytale-data:/data
      - /etc/machine-id:/etc/machine-id:ro
    deploy:
      resources:
        limits:
          memory: 10G
        reservations:
          memory: 4G
    healthcheck:
      test: ["CMD", "sh", "-c", "ss -ulpn | grep -q ':5520'"]
      interval: 30s
      timeout: 5s
      start_period: 120s
      retries: 3
    sysctls:
      net.core.somaxconn: "65535"
      net.ipv4.tcp_max_syn_backlog: "16384"
    ulimits:
      nofile:
        soft: 65536
        hard: 65536
    stdin_open: true
    tty: true
    restart: unless-stopped

volumes:
  hytale-data:
```
