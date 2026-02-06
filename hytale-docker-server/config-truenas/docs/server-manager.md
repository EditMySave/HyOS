# HyOS Manager User Guide

The HyOS Manager is a web-based dashboard for managing your Hytale dedicated server. Built with Next.js and React, it provides real-time monitoring, mod management, command execution, and full server control.

## Table of Contents

- [Deployment](#deployment)
- [Pages](#pages)
  - [Dashboard](#dashboard)
  - [Mods](#mods)
  - [Logs](#logs)
  - [Permissions](#permissions)
  - [Commands](#commands)
  - [Worlds](#worlds)
- [Configuration Persistence](#configuration-persistence)
- [Graceful Degradation](#graceful-degradation)

---

## Deployment

The Manager runs as a separate container alongside the Hytale server. It communicates via the REST API plugin and reads shared state files from the `/data/.state/` volume.

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HYTALE_SERVER_HOST` | `hyos` | Hostname of the Hytale server container |
| `HYTALE_SERVER_PORT` | `8080` | REST API port on the server |
| `REST_API_CLIENT_ID` | `hyos-manager` | Client ID for API authentication |
| `REST_API_CLIENT_SECRET` | — | Client secret — **must match** the server's `API_CLIENT_SECRET` |
| `HYTALE_CONTAINER_NAME` | `hyos` | Docker container name (for start/stop/restart) |
| `HYTALE_STATE_DIR` | `/data/.state` | Path to shared state files |
| `ADAPTER_TYPE` | `rest` | Connection adapter (`rest` for API-based control) |
| `NODE_ENV` | `production` | Node.js environment |

### Docker Socket

The Manager needs read-only access to the Docker socket for container lifecycle operations (start, stop, restart):

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
group_add:
  - "0"  # Root group for socket access
```

Without the Docker socket, the Manager still functions but cannot start/stop the container — it degrades to API-only mode.

### Connecting to the Server

The Manager authenticates with the REST API plugin using OAuth2 client credentials:

1. Set `API_CLIENT_SECRET` on the server container
2. Set `REST_API_CLIENT_SECRET` on the manager container to the **same value**
3. The manager exchanges credentials for a Bearer token (cached with 60-second refresh buffer)

The Manager also reads state files from the shared `/data` volume for server status, version info, and mod state.

---

## Pages

### Dashboard

The main overview page with real-time server monitoring.

**Cards and Widgets:**

- **Auth Notification** — Shows when OAuth re-authentication is needed (detected from container logs)
- **Game Stats** — Server name, MOTD, current version
- **Server Stats** — Player count, uptime, memory usage (used/max/free)
- **Quick Actions** — Start, stop, restart, backup, broadcast message, check for updates, schedule update on restart
- **Performance Chart** — Server resource utilization over time
- **Player Count Chart** — Player connection trends
- **Players Table** — Online players with name, world, and position

**Quick Actions Detail:**

| Action | Requires |
|--------|----------|
| Start Server | Docker socket |
| Stop Server | Docker socket |
| Restart Server | Docker socket |
| Backup | Server running, API connection |
| Broadcast Message | Server running, API connection |
| Check for Updates | API connection |
| Schedule Update on Restart | API connection, update available |

### Mods

Three-tab interface for mod management.

**Search Tab:**

- Browse mods from CurseForge, ModTale, and NexusMods
- Search and filter results
- One-click install from providers
- Configure provider API keys (CurseForge and NexusMods require keys)

**Upload Tab:**

- Drag-and-drop JAR file upload (max 100 MB)
- Automatic manifest validation
- Upload progress tracking

**Installed Tab:**

- **Plugins card** — Shows loaded plugins with name, version, and state (ENABLED/DISABLED)
- **Mods card** — Shows installed JARs with file size, modification date, and status badges:
  - **Loaded** — Plugin is active in the server
  - **Needs Patch** — Content-only mod missing a `Main` class
  - **Patched** — Stub `Main` class was injected
  - **Restart Required** — Mod was installed or removed but not yet loaded
- **Patch** button per mod (for content-only mods)
- **Patch All** button for batch patching
- **Delete** button to remove a mod

See [Mods & Plugins](mods-and-plugins.md) for details on content-only mod patching.

### Logs

Real-time log viewer with filtering and search.

**Controls:**

- **Level filter** — All, INFO, WARNING, ERROR, PLAYER, SYSTEM
- **Time range** — All, Last Hour, Last 24 Hours, Last 7 Days
- **Search** — Filter by message content, level, time, or date
- **Live toggle** — Pause/resume live log streaming (5-second refresh)
- **Clear** — Clear the log display

Logs are color-coded by level (blue for INFO, amber for WARNING, red for ERROR, green for SYSTEM). The view auto-scrolls to the latest entry when live streaming is active.

### Permissions

Three-tab permission system for managing server access.

**Operators Tab:**

- List all server operators (players in the `op` group)
- Add operators by UUID or username
- Remove operator status
- Changes take effect immediately via `/op add` and `/op remove` commands

**Groups Tab:**

- Create custom permission groups
- Edit group permissions (comma-separated permission strings)
- Delete custom groups (the `op` group cannot be deleted)
- Changes to custom groups require a server restart

**Users Tab:**

- List all users with their assigned groups and permissions
- Toggle operator status per user
- View per-user permission assignments

### Commands

Four-section command interface for server administration.

**Admin Commands:**

- Kick, ban, and mute players (with optional reason and duration)
- Broadcast messages to all online players
- Save the server world
- Manage the whitelist

**Player Commands:**

- Teleport players to coordinates or between worlds
- Set game mode (Survival, Creative, Adventure, Spectator)
- Give items by ID with quantity
- Clear inventory (all, hotbar, armor, storage, utility, tools)
- Send private messages
- Grant permissions and add to groups

**World Commands:**

- Set world time (0–24000 ticks) with presets (dawn, noon, dusk, midnight)
- Set weather (clear, rain, thunder)
- Set blocks at specific coordinates

**Raw Command Input:**

- Full command syntax with autocomplete/typeahead suggestions
- Parameter help with examples from the Hytale command database
- Recent commands history (stored in browser localStorage, last 10)

### Worlds

World file and save slot management.

**Upload Zone:**

- Drag-and-drop ZIP file upload for world imports
- Confirmation dialog before applying

**Universe File Browser:**

- Hierarchical file tree of current universe data
- Expandable/collapsible directories
- File sizes displayed
- Real-time refresh

**World Slots:**

- List of world save snapshots
- Auto-saved indicator for slots created via activation
- Per-slot actions:
  - **Activate** — Switch the active universe (auto-saves current to a new slot)
  - **Rename** — Change the slot name
  - **Delete** — Remove the slot (irreversible)

---

## Configuration Persistence

Manager settings are persisted to `{stateDir}/manager-config.json` using atomic writes (temp file + rename).

**Config loading priority:**

1. Built-in defaults
2. Environment variables override defaults
3. Persisted file overrides all

**Security:**

- `apiClientSecret` is never returned in GET responses — only a `hasSecret` boolean flag
- The `configuredVia` field indicates whether the secret came from `file` or `environment`

---

## Graceful Degradation

The Manager is designed to function even when some components are unavailable:

| Component | When Unavailable | Behavior |
|-----------|------------------|----------|
| Docker socket | TrueNAS, rootless Docker | Start/stop/restart buttons disabled; API-only mode |
| REST API | Server not running, misconfigured | Falls back to state files for status; commands unavailable |
| State files | Fresh install | Shows default/empty values |
| Mod providers | No API key configured | Search tab disabled for that provider |

The status endpoint checks health in order: API health check → state files → Docker container state, using the first available source.
