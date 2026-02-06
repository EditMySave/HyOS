# Mod Management Guide

Hytale supports server-side mods (plugins) loaded from JAR files. HyOS provides automated mod validation, content-only mod patching, a broken mod quarantine system, and integration with mod providers.

## Table of Contents

- [How Mods Work](#how-mods-work)
- [Installing Mods](#installing-mods)
- [Mod Loading Pipeline](#mod-loading-pipeline)
- [Content-Only Mod Patching](#content-only-mod-patching)
- [The API Plugin](#the-api-plugin)
- [Mod Provider Setup](#mod-provider-setup)
- [Troubleshooting](#troubleshooting)

---

## How Mods Work

Hytale mods are Java JAR files containing a `manifest.json` at the JAR root. The manifest declares the mod's metadata and entry point:

```json
{
  "Group": "com.example",
  "Name": "MyMod",
  "Version": "1.0.0",
  "Main": "com.example.MyMod",
  "ServerVersion": "2026.01.17",
  "Dependencies": []
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `Group` | Yes | Java package group (e.g., `com.hytale`) |
| `Name` | Yes | Mod display name |
| `Version` | Yes | Semantic version |
| `Main` | Yes | Fully-qualified entry class name |
| `ServerVersion` | No | Target server version |
| `Dependencies` | No | List of required mod dependencies |

> **Critical**: A missing `Main` field causes a `NullPointerException` in Hytale's `PluginClassLoader.loadLocalClass` → `ClassLoader.getClassLoadingLock(null)`. This is the most common mod loading failure. See [Content-Only Mod Patching](#content-only-mod-patching).

---

## Installing Mods

### Manual Installation

Place `.jar` files in the `/data/mods/` directory:

```bash
# Copy a mod into the container volume
cp MyMod-1.0.0.jar /mnt/tank/apps/hytale/mods/

# Restart to load
docker restart hyos-server
```

The entrypoint auto-detects the `/data/mods/` directory and passes `--mods /data/mods` to the server.

### Via the Manager UI

1. **Upload** — Go to Mods → Upload, drag-and-drop a JAR file (max 100 MB)
2. **Browse** — Go to Mods → Search, find mods from CurseForge, ModTale, or NexusMods, and click Install

Both methods place the JAR in `/data/mods/`. A server restart is required to load new mods.

---

## Mod Loading Pipeline

HyOS wraps the Hytale mod loading process with validation, monitoring, and state tracking.

### 1. Pre-Flight Validation

Before the server starts, the entrypoint inspects each JAR in `/data/mods/`:

- Checks for `manifest.json` inside the JAR
- Validates that the `Main` field is present and non-empty
- Logs warnings for mods that will likely fail to load

### 2. Broken Mod Quarantine

When `SKIP_BROKEN_MODS=true`, mods that failed on a previous startup are automatically moved to `/data/mods/.disabled/`:

```yaml
environment:
  SKIP_BROKEN_MODS: "true"
```

- Broken mods are tracked per server version in `.broken-mods` (format: `version:filename`)
- When the server updates to a new version, previously broken mods are retried automatically
- To re-enable a quarantined mod: move it from `mods/.disabled/` back to `mods/` and restart with `SKIP_BROKEN_MODS=false`

### 3. Background Mod Monitor

30 seconds after the server starts, a background process parses the server logs to detect mod loading results:

- Identifies which mods loaded successfully
- Captures failure messages and error types
- Updates the `mods.json` state file for the Manager UI

### 4. State Tracking

Mod loading state is persisted in `/data/.state/mods.json`:

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

---

## Content-Only Mod Patching

### What Are Content-Only Mods?

Some mods are asset/content packs — they contain textures, models, or world data but no Java code. These mods ship without a `Main` class in their manifest.

### Why They Fail

Hytale's plugin loader requires a `Main` class for every mod. When `Main` is missing or `null`, the server crashes with:

```
NullPointerException in PluginClassLoader.loadLocalClass
  → ClassLoader.getClassLoadingLock(null)
```

### How Auto-Patching Works

HyOS can patch content-only mods by injecting a minimal stub class:

1. A no-op Java class is compiled and bundled at `/opt/stub/` in the Docker image
2. When a mod is identified as content-only (missing `Main`), the patch process:
   - Adds the stub `.class` file into the JAR
   - Updates `manifest.json` to set `Main` to the stub class name
3. The patched mod loads successfully — the stub class does nothing at runtime

### Using the Manager UI

1. Go to **Mods → Installed**
2. Mods needing patching show a **"Needs Patch"** badge
3. Click **Patch** on individual mods, or **Patch All** for batch patching
4. Restart the server to load the patched mods

### Using the API

```bash
# Patch a specific mod
curl -X POST http://localhost:8080/mods/{mod-id}/patch \
  -H "Authorization: Bearer <token>"
```

---

## The API Plugin

The HytaleAPI plugin is a built-in REST API that enables remote server management. It is pre-packaged at `/opt/plugins/` and automatically installed to `/data/mods/` on startup.

### Configuration

The plugin's config is auto-generated at `/data/server/mods/com.hytale_HytaleAPI/config.json` from environment variables. Key settings:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_ENABLED` | `true` | Enable the API plugin |
| `API_PORT` | `8080` | HTTP listen port |
| `API_CLIENT_ID` | `hyos-manager` | Client identifier |
| `API_CLIENT_SECRET` | — | Password (bcrypt-hashed before writing) |
| `API_WEBSOCKET_ENABLED` | `true` | WebSocket support for real-time events |

Set `API_REGENERATE_CONFIG=true` to force config regeneration on startup (useful when changing the password).

### Security

- The plaintext password is **never stored on disk** — only a bcrypt hash (12 rounds)
- Config file permissions are set to `600` (owner-readable only)
- JWT tokens use RS256 for API authentication
- Rate limiting is enabled by default (300 requests/minute)

### Endpoint Overview

The API provides endpoints for:

- **Server control** — status, start, stop, restart, save
- **Players** — list online, kick, ban, mute, teleport, give items
- **Worlds** — list, set time/weather, manage save slots
- **Mods** — list loaded, upload, delete, patch
- **Permissions** — operators, groups, per-user assignments
- **Commands** — execute raw server commands

Full API documentation is available in the Manager UI or via the API's `/health` endpoint.

---

## Mod Provider Setup

The Manager can browse and install mods from external providers. Some require API keys.

### CurseForge

1. Get an API key from [CurseForge for Studios](https://console.curseforge.com/)
2. In the Manager: **Mods → Search → Settings** (gear icon)
3. Enter your CurseForge API key

### NexusMods

1. Get an API key from [NexusMods API Settings](https://www.nexusmods.com/users/myaccount?tab=api+access)
2. In the Manager: **Mods → Search → Settings** (gear icon)
3. Enter your NexusMods API key

### ModTale

ModTale does not require an API key — it is available by default.

---

## Troubleshooting

### Mod fails with NullPointerException

**Cause**: Missing `Main` class in `manifest.json` (content-only mod).

**Fix**: Patch the mod via the Manager UI or set `SKIP_BROKEN_MODS=true` to quarantine it.

### Mod loads but doesn't work

1. Check server version compatibility (`ServerVersion` in manifest)
2. Check for missing dependencies
3. Enable `DEBUG_CLASSLOADING=true` for verbose JVM class loading output
4. Check logs: `docker logs hyos-server | grep -i "mod\|plugin"`

### Mod quarantined unexpectedly

1. Check `/data/mods/.disabled/` for the moved JAR
2. Move it back to `/data/mods/`
3. Restart with `SKIP_BROKEN_MODS=false`
4. Check logs for the actual failure reason

### Provider search returns no results

1. Verify the API key is set in Manager settings
2. Check that the mod exists for Hytale (not all providers have Hytale categories yet)
3. Try different search terms

### Mods state shows "Restart Required"

Mods installed or removed while the server is running are not loaded until restart. Restart the server to apply changes.
