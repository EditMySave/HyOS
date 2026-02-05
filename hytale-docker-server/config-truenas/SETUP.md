# Hytale Server - TrueNAS SCALE Configuration

Enterprise-grade Hytale server configuration optimized for TrueNAS SCALE Custom Apps.

## Table of Contents

- [Hytale Server - TrueNAS SCALE Configuration](#hytale-server---truenas-scale-configuration)
  - [Table of Contents](#table-of-contents)
  - [Quick Start](#quick-start)
    - [1. Create TrueNAS Dataset](#1-create-truenas-dataset)
    - [2. Deploy via Custom App](#2-deploy-via-custom-app)
    - [3. Complete Authentication](#3-complete-authentication)
  - [Environment Variables](#environment-variables)
    - [User \& Permission Settings](#user--permission-settings)
    - [JVM Memory Settings](#jvm-memory-settings)
    - [Garbage Collector Settings](#garbage-collector-settings)
    - [Server Settings](#server-settings)
    - [Auto-Update Settings](#auto-update-settings)
    - [Config Generation](#config-generation)
    - [Whitelist Configuration](#whitelist-configuration)
    - [Hytale Server Options](#hytale-server-options)
      - [Core Options](#core-options)
      - [Backup Options](#backup-options)
      - [Debug \& Logging Options](#debug--logging-options)
      - [Plugin \& Mod Options](#plugin--mod-options)
      - [World \& Universe Options](#world--universe-options)
      - [Advanced Options](#advanced-options)
    - [Token Injection (Hosting Providers)](#token-injection-hosting-providers)
    - [Debug Settings](#debug-settings)
  - [Volume Structure](#volume-structure)
  - [State Files](#state-files)
    - [server.json](#serverjson)
    - [version.json](#versionjson)
    - [auth.json](#authjson)
    - [config.json (state)](#configjson-state)
    - [health.json](#healthjson)
    - [mods.json](#modsjson)
    - [update.json](#updatejson)
  - [Command Scripts](#command-scripts)
    - [status.sh](#statussh)
    - [update.sh](#updatesh)
    - [auth-init.sh](#auth-initsh)
    - [auto-update.sh](#auto-updatesh)
  - [Health Checks](#health-checks)
  - [Architecture](#architecture)
    - [Script Structure](#script-structure)
    - [Startup Flow](#startup-flow)
    - [Base Image](#base-image)
  - [Troubleshooting](#troubleshooting)
    - [Container Immediately Exits](#container-immediately-exits)
    - [Authentication Fails](#authentication-fails)
    - [Server Won't Start](#server-wont-start)
    - [Game Files Re-download Every Restart](#game-files-re-download-every-restart)
    - [Mods Fail to Load (NullPointerException)](#mods-fail-to-load-nullpointerexception)

---

## Quick Start

### 1. Create TrueNAS Dataset

```bash
# Create dataset for server data
zfs create tank/apps/hytale

# Set permissions (UID 568 = default TrueNAS apps user)
chown -R 568:568 /mnt/tank/apps/hytale
```

### 2. Deploy via Custom App

1. Go to **Apps → Discover Apps → Custom App**
2. Click **Install via YAML**
3. Paste the contents of `compose.yaml`
4. Update the volume path to match your dataset
5. Deploy

### 3. Complete Authentication

On first run, check the container logs for the OAuth URL:

```
╔══════════════════════════════════════════════════════════════╗
║                    AUTHENTICATION REQUIRED                    ║
╠══════════════════════════════════════════════════════════════╣
║  Visit: https://oauth.accounts.hytale.com/oauth2/device/...  ║
║  Code: ABC123XY                                               ║
╚══════════════════════════════════════════════════════════════╝
```

**Important**: Do not restart the container during authentication. Complete within 15 minutes.

---

## Environment Variables

### User & Permission Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PUID` | `integer` | `568` | User ID for the server process. TrueNAS default is 568. |
| `PGID` | `integer` | `568` | Group ID for the server process. Match to dataset ownership. |
| `UMASK` | `string` | `002` | File creation mask. `002` = group writable. |
| `TZ` | `string` | `UTC` | Timezone for logs and backups. |

**Example:**

```yaml
environment:
  - PUID=568
  - PGID=568
  - UMASK=002
  - TZ=America/New_York
```

### JVM Memory Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `JAVA_XMS` | `string` | `4G` | Initial heap size. Minimum 4G recommended. |
| `JAVA_XMX` | `string` | `8G` | Maximum heap size. Set to ~50-75% of available RAM. |
| `JAVA_OPTS` | `string` | - | Additional JVM options (appended). |
| `JVM_XX_OPTS` | `string` | - | Additional -XX JVM options (appended). |

**Example:**

```yaml
environment:
  - JAVA_XMS=4G
  - JAVA_XMX=8G
  - JAVA_OPTS=-Dfile.encoding=UTF-8
```

**Memory Guidelines:**

| Server Type | Min RAM | Recommended |
|-------------|---------|-------------|
| Personal (1-10 players) | 4GB | 6GB |
| Small (10-30 players) | 8GB | 12GB |
| Medium (30-50 players) | 12GB | 16GB |
| Large (50+ players) | 16GB+ | 24GB+ |

### Garbage Collector Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `USE_ZGC` | `boolean` | `false` | Use ZGC instead of G1GC. Better for low-latency but higher memory overhead. |
| `G1_MAX_PAUSE` | `integer` | `200` | G1GC max pause time in milliseconds. |
| `G1_NEW_SIZE_PERCENT` | `integer` | - | G1GC new generation size as percentage of heap. |
| `G1_MAX_NEW_SIZE_PERCENT` | `integer` | - | G1GC max new generation size as percentage. |
| `G1_HEAP_REGION_SIZE` | `string` | - | G1GC heap region size (e.g., `16m`). |
| `ZGC_INTERVAL` | `integer` | - | ZGC collection interval in seconds. |

**G1GC (Default) - Balanced performance:**

```yaml
environment:
  - USE_ZGC=false
  - G1_MAX_PAUSE=200
```

**ZGC - Low latency (requires more RAM):**

```yaml
environment:
  - USE_ZGC=true
  - ZGC_INTERVAL=30
```

### Server Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SERVER_PORT` | `integer` | `5520` | UDP port for the server. Must match exposed port. |
| `PATCHLINE` | `string` | `release` | Server version: `release`, `staging`, or `nightly`. |
| `ENABLE_AOT` | `boolean` | `true` | Use AOT (Ahead-of-Time) compilation cache for faster startup. |

**Example:**

```yaml
environment:
  - SERVER_PORT=5520
  - PATCHLINE=release
  - ENABLE_AOT=true
```

### Auto-Update Settings

Automatic server updates can be enabled to keep the server up-to-date with the latest Hytale releases.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTO_UPDATE` | `boolean` | `false` | Enable automatic updates at container startup. |
| `AUTO_UPDATE_INTERVAL` | `integer` | `3600` | Interval between update checks in seconds (for background mode). |
| `AUTO_UPDATE_TIME` | `string` | - | Specific time to check for updates (HH:MM format, e.g., "04:00"). |
| `AUTO_UPDATE_RESTART` | `boolean` | `true` | Automatically restart the server after applying an update. |
| `AUTO_UPDATE_BACKUP` | `boolean` | `true` | Create a backup before applying updates. |
| `VERSION_CHECK_ENABLED` | `boolean` | `true` | Refresh version state after auth and periodically (for manager UI). |
| `VERSION_CHECK_INTERVAL` | `integer` | `3600` | Seconds between version checks (1 hour). |

**Startup Auto-Update:**

When `AUTO_UPDATE=true`, the container checks for updates at startup and applies them before starting the server.

```yaml
environment:
  - AUTO_UPDATE=true
  - AUTO_UPDATE_BACKUP=true
```

**Scheduled Updates (Background Mode):**

For scheduled updates while the server is running, use the auto-update command:

```bash
# Run update check once
docker exec hyos /opt/scripts/cmd/auto-update.sh --once

# Or schedule via cron on the host
# Checks every hour, updates and restarts if needed
0 * * * * docker exec hyos /opt/scripts/cmd/auto-update.sh --once
```

**Specific Time Updates:**

To check for updates at a specific time (e.g., 4:00 AM):

```yaml
environment:
  - AUTO_UPDATE=true
  - AUTO_UPDATE_TIME=04:00
```

### Config Generation

The container auto-generates `config.json` from environment variables. Set `SKIP_CONFIG_GENERATION=true` to manage it manually.

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `SKIP_CONFIG_GENERATION` | `boolean` | `false` | Skip auto-generation, manage config.json manually. |
| `SERVER_NAME` | `string` | `Hytale Server` | Server name displayed in server list. |
| `SERVER_MOTD` | `string` | - | Message of the day shown to players. |
| `SERVER_PASSWORD` | `string` | - | Server password (leave empty for public). |
| `MAX_PLAYERS` | `integer` | `100` | Maximum concurrent players. |
| `MAX_VIEW_RADIUS` | `integer` | `32` | Maximum view distance in chunks. |
| `DEFAULT_WORLD` | `string` | `default` | Default world name on join. |
| `DEFAULT_GAMEMODE` | `string` | `Adventure` | Default game mode: `Adventure`, `Creative`, `Survival`. |
| `LOCAL_COMPRESSION` | `boolean` | `false` | Enable local compression. |
| `DISPLAY_TMP_TAGS` | `boolean` | `false` | Display temporary tags in strings. |
| `PLAYER_STORAGE_TYPE` | `string` | `Hytale` | Player data storage type. |
| `HYTALE_CONFIG_JSON` | `string` | - | Full config.json override as JSON string. |

**Example:**

```yaml
environment:
  - SKIP_CONFIG_GENERATION=false
  - SERVER_NAME=My Awesome Server
  - SERVER_MOTD=Welcome to my server!
  - MAX_PLAYERS=50
  - DEFAULT_GAMEMODE=Adventure
```

**Generated config.json structure:**

```json
{
  "Version": 3,
  "ServerName": "My Awesome Server",
  "MOTD": "Welcome to my server!",
  "Password": "",
  "MaxPlayers": 50,
  "MaxViewRadius": 32,
  "LocalCompressionEnabled": false,
  "Defaults": {
    "World": "default",
    "GameMode": "Adventure"
  },
  "ConnectionTimeouts": { "JoinTimeouts": {} },
  "RateLimit": {},
  "Modules": {},
  "LogLevels": {},
  "Mods": {},
  "DisplayTmpTagsInStrings": false,
  "PlayerStorage": { "Type": "Hytale" }
}
```

### Whitelist Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `WHITELIST_ENABLED` | `boolean` | `false` | Enable player whitelist. |
| `WHITELIST_LIST` | `string` | - | Comma-separated list of allowed usernames. |
| `WHITELIST_JSON` | `string` | - | Full whitelist.json override. |

**Using comma-separated list:**

```yaml
environment:
  - WHITELIST_ENABLED=true
  - WHITELIST_LIST=player1,player2,player3
```

**Using full JSON override:**

```yaml
environment:
  - WHITELIST_ENABLED=true
  - WHITELIST_JSON={"enabled": true, "players": ["player1", "player2"]}
```

### Hytale Server Options

All Hytale server CLI options are available via `HYTALE_*` environment variables.

#### Core Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_ACCEPT_EARLY_PLUGINS` | `boolean` | `false` | Accept early/experimental plugins. |
| `HYTALE_ALLOW_OP` | `boolean` | `false` | Allow operator commands. |
| `HYTALE_AUTH_MODE` | `string` | - | Authentication mode: `authenticated` or `offline`. |
| `HYTALE_BARE` | `boolean` | `false` | Run in bare mode (minimal). |
| `HYTALE_SINGLEPLAYER` | `boolean` | `false` | Run in singleplayer mode. |

#### Backup Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_BACKUP` | `boolean` | `false` | Enable automatic backups. |
| `HYTALE_BACKUP_DIR` | `string` | `/data/backups` | Backup directory path. |
| `HYTALE_BACKUP_FREQUENCY` | `integer` | `30` | Backup frequency in minutes. |
| `HYTALE_BACKUP_MAX_COUNT` | `integer` | - | Maximum number of backups to keep. |

**Example:**

```yaml
environment:
  - HYTALE_BACKUP=true
  - HYTALE_BACKUP_FREQUENCY=30
  - HYTALE_BACKUP_MAX_COUNT=10
```

#### Debug & Logging Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_DISABLE_SENTRY` | `boolean` | `false` | Disable Sentry error reporting. |
| `HYTALE_DISABLE_FILE_WATCHER` | `boolean` | `false` | Disable file watcher for hot reloading. |
| `HYTALE_EVENT_DEBUG` | `boolean` | `false` | Enable event debugging. |
| `HYTALE_LOG` | `string` | - | Log level or configuration. |

#### Plugin & Mod Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_MODS` | `string` | - | Path to mods directory. Auto-detects `/data/mods` if present. |
| `HYTALE_EARLY_PLUGINS` | `string` | - | Path to early plugins. |
| `DEBUG_CLASSLOADING` | `boolean` | `false` | Enable verbose JVM class loading output for mod diagnostics. |
| `SKIP_BROKEN_MODS` | `boolean` | `false` | Auto-quarantine mods that failed to load on previous startup. |

#### World & Universe Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_UNIVERSE` | `string` | - | Path to universe data. |
| `HYTALE_WORLD_GEN` | `string` | - | World generator configuration. |
| `HYTALE_BOOT_COMMAND` | `string` | - | Command to run on boot. |

#### Advanced Options

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `HYTALE_DISABLE_ASSET_COMPARE` | `boolean` | `false` | Disable asset comparison checks. |
| `HYTALE_DISABLE_CPB_BUILD` | `boolean` | `false` | Disable CPB build. |
| `HYTALE_FORCE_NETWORK_FLUSH` | `integer` | - | Force network flush interval. |
| `HYTALE_GENERATE_SCHEMA` | `boolean` | `false` | Generate schema files. |
| `HYTALE_MIGRATE_WORLDS` | `string` | - | Migrate worlds from path. |
| `HYTALE_MIGRATIONS` | `string` | - | Migration configuration. |
| `HYTALE_OWNER_NAME` | `string` | - | Server owner name. |
| `HYTALE_PREFAB_CACHE` | `string` | - | Prefab cache path. |
| `HYTALE_SHUTDOWN_AFTER_VALIDATE` | `boolean` | `false` | Shutdown after validation. |
| `HYTALE_TRANSPORT` | `string` | - | Transport protocol configuration. |
| `HYTALE_VALIDATE_ASSETS` | `boolean` | `false` | Validate assets on startup. |
| `HYTALE_VALIDATE_PREFABS` | `string` | - | Validate prefabs. |
| `HYTALE_VALIDATE_WORLD_GEN` | `boolean` | `false` | Validate world generation. |
| `HYTALE_EXTRA_ARGS` | `string` | - | Additional server arguments (passthrough). |

### Token Injection (Hosting Providers)

For automated deployments, pre-inject authentication tokens to skip the OAuth flow.

| Variable | Type | Description |
|----------|------|-------------|
| `HYTALE_SERVER_SESSION_TOKEN` | `string` | Pre-authenticated session token. |
| `HYTALE_SERVER_IDENTITY_TOKEN` | `string` | Pre-authenticated identity token. |
| `HYTALE_OWNER_UUID` | `string` | Server owner's UUID. |

**Example:**

```yaml
environment:
  - HYTALE_SERVER_SESSION_TOKEN=eyJhbGciOiJSUzI1NiIsInR5cCI6...
  - HYTALE_SERVER_IDENTITY_TOKEN=eyJhbGciOiJFUzI1NiIsInR5cCI6...
  - HYTALE_OWNER_UUID=12345678-1234-1234-1234-123456789abc
```

### Debug Settings

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `DEBUG` | `boolean` | `false` | Enable debug logging in entrypoint scripts. |
| `NO_COLOR` | `boolean` | `false` | Disable colored output in logs. |

---

## Volume Structure

Mount a single volume to `/data`:

```yaml
volumes:
  - /mnt/tank/apps/hytale:/data:rw
```

**Directory structure inside `/data`:**

```
/data/
├── server/                 # Server files (auto-managed)
│   ├── HytaleServer.jar
│   ├── HytaleServer.aot    # AOT cache (auto-generated)
│   ├── config.json         # Server configuration
│   └── whitelist.json      # Whitelist (if enabled)
├── Assets.zip              # Game assets (auto-managed)
├── backups/                # Automatic backups
├── mods/                   # Custom mods (place .jar files here)
├── universe/               # Universe/world data
├── logs/                   # Server logs
├── .auth/                  # OAuth tokens (auto-managed)
│   └── tokens.json
└── .state/                 # State files for Web UI
    ├── server.json
    ├── version.json
    ├── auth.json
    ├── config.json
    ├── health.json
    ├── update.json
    └── mods.json
```

---

## State Files

State files in `/data/.state/` provide structured data for Web UI integration. All files use atomic writes to prevent partial reads.

### server.json

```typescript
interface ServerState {
  status: "starting" | "running" | "stopped" | "crashed" | "unknown";
  pid: number | null;
  started_at: string | null;  // ISO 8601
  updated_at: string;         // ISO 8601
}
```

**Example:**

```json
{
  "status": "running",
  "pid": 1234,
  "started_at": "2026-01-19T12:00:00+00:00",
  "updated_at": "2026-01-19T12:05:00+00:00"
}
```

### version.json

```typescript
interface VersionState {
  current: string;
  latest: string | null;
  needs_update: boolean;
  checked_at: string;  // ISO 8601
}
```

**Example:**

```json
{
  "current": "2026.01.17-4b0f30090",
  "latest": "2026.01.19-abc12345",
  "needs_update": true,
  "checked_at": "2026-01-19T12:00:00+00:00"
}
```

### auth.json

```typescript
interface AuthState {
  status: "authenticated" | "pending" | "failed" | "timeout" | "unknown";
  authenticated: boolean;
  profile: string | null;     // Username
  expires_at: string | null;  // ISO 8601
  updated_at: string;         // ISO 8601
}
```

**Example:**

```json
{
  "status": "authenticated",
  "authenticated": true,
  "profile": "Ricehead",
  "expires_at": "2026-01-19T18:00:00+00:00",
  "updated_at": "2026-01-19T12:00:00+00:00"
}
```

### config.json (state)

Sanitized copy of server configuration (no passwords).

```typescript
interface ConfigState {
  config: {
    server_name: string;
    motd: string;
    max_players: number;
    max_view_radius: number;
    default_world: string;
    default_gamemode: string;
    whitelist_enabled: boolean;
    local_compression: boolean;
    has_password: boolean;
  };
  updated_at: string;  // ISO 8601
}
```

### health.json

```typescript
interface HealthState {
  status: "healthy" | "unhealthy";
  healthy: boolean;
  message: string;
  checks: HealthCheck[];
  checked_at: string;  // ISO 8601
}

interface HealthCheck {
  name: string;
  status: "pass" | "fail" | "warn" | "skip";
  message: string;
}
```

**Example:**

```json
{
  "status": "healthy",
  "healthy": true,
  "message": "OK",
  "checks": [
    {"name": "process", "status": "pass", "message": "Server process running (PID: 1234)"},
    {"name": "port", "status": "pass", "message": "Port 5520/udp is bound"},
    {"name": "data_dir", "status": "pass", "message": "Data directory accessible"},
    {"name": "memory", "status": "pass", "message": "Memory usage: 45%"}
  ],
  "checked_at": "2026-01-19T12:00:00+00:00"
}
```

### mods.json

```typescript
interface ModsState {
  loaded: string[];            // Successfully loaded mod filenames
  failed: ModFailure[];        // Mods that failed to load
  total: number;               // Total mods attempted
  loaded_count: number;        // Number successfully loaded
  failed_count: number;        // Number that failed
  updated_at: string;          // ISO 8601
}

interface ModFailure {
  file: string;                // JAR filename
  error: string;               // Error description
}
```

**Example:**

```json
{
  "loaded": ["HyPipes-1.2.1.jar", "HomesPlus-2.1.8.jar"],
  "failed": [
    {"file": "YUNGs-HyDungeons.jar", "error": "NullPointerException in PluginClassLoader"}
  ],
  "total": 3,
  "loaded_count": 2,
  "failed_count": 1,
  "updated_at": "2026-02-04T01:43:10+00:00"
}
```

### update.json

```typescript
interface UpdateState {
  status: "idle" | "checking" | "downloading" | "updating" | "failed";
  message: string;
  last_check: string | null;     // ISO 8601
  next_check: string | null;     // ISO 8601
  auto_update_enabled: boolean;
  updated_at: string;            // ISO 8601
}
```

**Example:**

```json
{
  "status": "idle",
  "message": "Server is up to date",
  "last_check": "2026-01-19T12:00:00+00:00",
  "next_check": "2026-01-19T13:00:00+00:00",
  "auto_update_enabled": true,
  "updated_at": "2026-01-19T12:00:00+00:00"
}
```

---

## Command Scripts

Standalone scripts in `/opt/scripts/cmd/` for external control.

### status.sh

Get comprehensive server status.

```bash
# Human-readable output
docker exec hyos /opt/scripts/cmd/status.sh

# JSON output (for Web UI)
docker exec hyos /opt/scripts/cmd/status.sh --json
```

**JSON Output:**

```json
{
  "server": {
    "running": true,
    "pid": 1234,
    "uptime_seconds": 3600
  },
  "version": {
    "current": "2026.01.17-4b0f30090",
    "latest": null,
    "needs_update": false
  },
  "resources": {
    "memory_used": 4294967296,
    "memory_total": 8589934592,
    "disk_used": 10737418240,
    "disk_total": 107374182400
  },
  "config": {
    "java_xms": "4G",
    "java_xmx": "8G",
    "gc_type": "G1GC",
    "server_port": 5520
  },
  "timestamp": "2026-01-19T12:00:00+00:00"
}
```

### update.sh

Manually trigger a server update.

```bash
# Check for updates (dry run)
docker exec hyos /opt/scripts/cmd/update.sh --check

# Force update with backup
docker exec hyos /opt/scripts/cmd/update.sh --backup --force
```

### auth-init.sh

Re-run authentication flow.

```bash
docker exec -it hyos /opt/scripts/cmd/auth-init.sh
```

### auto-update.sh

Automatic server update script for scheduled or manual use.

```bash
# Run single update check (for cron jobs)
docker exec hyos /opt/scripts/cmd/auto-update.sh --once

# View update logs
docker exec hyos cat /data/logs/auto-update.log
```

**Environment variables for auto-update:**

- `AUTO_UPDATE_INTERVAL` - Check interval in seconds (default: 3600)
- `AUTO_UPDATE_TIME` - Specific time to check (HH:MM format)
- `AUTO_UPDATE_RESTART` - Restart server after update (default: true)
- `AUTO_UPDATE_BACKUP` - Create backup before update (default: true)
- `VERSION_CHECK_ENABLED` - Refresh version.json after auth and periodically (default: true)
- `VERSION_CHECK_INTERVAL` - Seconds between version checks (default: 3600)

---

## Health Checks

The container includes a comprehensive health check that runs every 30 seconds.

**Checks performed:**

1. **Process** - Server JAR process is running
2. **Port** - UDP port 5520 is bound
3. **Data Directory** - `/data` is writable
4. **Server JAR** - JAR file exists
5. **Memory** - System memory usage (warning if >90%)

**Manual health check:**

```bash
# Simple check
docker exec hyos /opt/scripts/healthcheck.sh

# JSON output
docker exec hyos /opt/scripts/healthcheck.sh --json
```

**Docker health status:**

```bash
docker inspect --format='{{.State.Health.Status}}' hyos
```

---

## Architecture

### Script Structure

```
/opt/scripts/
├── entrypoint.sh          # Main orchestrator
├── healthcheck.sh         # Health check script
├── lib/                   # Library scripts (sourced)
│   ├── utils.sh           # Logging, JSON helpers
│   ├── state.sh           # State file management
│   ├── auth.sh            # OAuth authentication
│   ├── options.sh         # Server option builder
│   ├── config.sh          # Config generation
│   └── download.sh        # Server file management
└── cmd/                   # Standalone commands
    ├── status.sh          # Server status
    ├── update.sh          # Manual updates
    ├── auto-update.sh     # Automatic updates
    └── auth-init.sh       # Re-authenticate
```

### Startup Flow

```
1. Early diagnostics (architecture, permissions)
2. User setup (PUID/PGID)
3. Directory creation
4. State initialization
5. Server file download (if needed)
6. Quarantine broken mods (if SKIP_BROKEN_MODS=true)
7. Config generation
8. OAuth authentication
9. Drop privileges
10. Start mod loading monitor (background)
11. Start Java process
```

### Base Image

Built on `eclipse-temurin:25-jre-alpine` with:

- **tini** - Proper init system for signal handling
- **su-exec** - Lightweight privilege dropping
- **jq** - JSON processing
- **curl** - HTTP requests
- **iproute2** - Network utilities for health checks

---

## Troubleshooting

### Container Immediately Exits

1. **Check permissions**: Ensure dataset is owned by PUID:PGID (default 568:568)
2. **Check architecture**: Only x86_64/amd64 is supported
3. **Check logs**: `docker logs hyos`

### Authentication Fails

1. **Don't restart**: Complete OAuth within 15 minutes
2. **Check URL**: Ensure you're using the correct verification URL
3. **Clear cache**: Remove `/data/.auth/tokens.json` and restart

### Server Won't Start

1. **Check memory**: Ensure `JAVA_XMX` doesn't exceed available RAM
2. **Check port**: Ensure UDP 5520 is not in use
3. **Check state**: View `/data/.state/server.json` for status

### Game Files Re-download Every Restart

This should not happen with the latest image. If it does:

1. Check `/data/server/` or `/data/Server/` exists
2. Verify `HytaleServer.jar` is present
3. Check file permissions

### Mods Fail to Load (NullPointerException)

Some mods may fail with `Failed to load plugin` and a `NullPointerException`
in `PluginClassLoader`. This is a Hytale server bug, not a Docker issue.

**Diagnosis:**
1. Check which mods failed: `cat /data/.state/mods.json | jq .failed`
2. Enable verbose diagnostics: set `DEBUG_CLASSLOADING=true`

**Mitigations:**
1. **Auto-quarantine**: Set `SKIP_BROKEN_MODS=true` to auto-move failing mods
   to `mods/.disabled/` on next restart
2. **Manual removal**: Move broken JARs out of `/data/mods/`
3. **Check for updates**: The mod may need updating for the current server version
4. **Re-enable quarantined mods**: Move from `mods/.disabled/` back to `mods/`,
   then restart with `SKIP_BROKEN_MODS=false`

The broken mods list is version-tagged — when the server updates, previously
broken mods will be retried automatically.
