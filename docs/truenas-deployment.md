# TrueNAS SCALE Deployment Guide

Two deployment methods are available for TrueNAS SCALE: the **native TrueNAS App** (recommended) or a **Custom App** using a compose file.

## Table of Contents

- [Native TrueNAS App](#native-truenas-app)
- [Custom App (Compose)](#custom-app-compose)
- [TrueNAS-Specific Considerations](#truenas-specific-considerations)

---

## Native TrueNAS App

The native app integrates with the TrueNAS SCALE app catalog and provides a guided UI for all configuration options.

### How It Works

The app is defined by the following files in the `truenas-app/` directory:

| File | Purpose |
|------|---------|
| `app.yaml` | App metadata: name, version, capabilities, icon, requirements |
| `questions.yaml` | Defines the TrueNAS UI configuration form (all settings groups) |
| `ix_values.yaml` | Default values and container image references |
| `templates/docker-compose.yaml` | Jinja2 template that generates the actual Docker Compose from user inputs |
| `templates/test_values/basic-values.yaml` | Test fixture for CI validation of the Jinja2 template |
| `item.yaml` | Catalog item metadata (train, categories) |
| `icon.png` | App icon displayed in the TrueNAS catalog |

### Requirements

- TrueNAS SCALE **24.10.2.2** or later
- 8 GB RAM minimum (12 GB+ recommended)
- 4+ CPU cores
- x86_64/amd64 architecture

### Installation

1. Navigate to **Apps > Discover Apps > Custom App**
2. Import the app catalog from the repository
3. Click **Install** and walk through the configuration groups

### Configuration Groups

The TrueNAS UI presents settings in organized groups:

#### 1. Hytale Server Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| TZ Timezone | `Etc/UTC` | Timezone for logs and scheduled tasks (e.g., `America/New_York`) |
| Server Name | `Hytale Server` | Display name in the server list |
| Server MOTD | — | Message of the day |
| Server Password | — | Leave empty for a public server |
| Max Players | `100` | Maximum concurrent players |
| Default Gamemode | `Adventure` | `Adventure`, `Creative`, or `Survival` |
| Patchline | `release` | Version channel: `release`, `staging`, `nightly` |

#### 2. JVM & Memory

| Setting | Default | Description |
|---------|---------|-------------|
| Initial Heap (XMS) | `4G` | Starting heap size |
| Max Heap (XMX) | `8G` | Maximum heap size — set to 50–75% of allocated RAM |
| Use ZGC | `false` | ZGC for low-latency (needs more RAM) |
| G1 Max Pause | `200` | G1GC max pause time in ms (when not using ZGC) |

#### 3. Auto-Update

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Auto-Update | `false` | Check for updates at container startup |
| Check Interval | `3600` | Seconds between checks (background mode) |
| Update Time | — | Specific time to check (`HH:MM` format) |
| Auto-Restart | `true` | Restart server after applying an update |
| Backup Before Update | `true` | Create a backup before applying updates |

#### 4. API Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Enable REST API | `true` | Required for the Manager UI |
| Client Secret | — | **Required** — password for API authentication |
| Client ID | `hyos-manager` | Client identifier |
| Enable WebSocket | `true` | Real-time updates to the Manager |

#### 5. Manager (Web UI)

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Manager | `true` | Deploy the HyOS Manager web UI alongside the server |

When enabled, a second container (`hyos-manager`) is deployed with access to shared state files and the Docker socket.

#### 6. Advanced Configuration

Toggle **Show Advanced Options** to reveal:

- **Auth Mode** — `authenticated` or `offline`
- **AOT Cache** — Ahead-of-Time compilation for faster startup
- **Disable Sentry** — Turn off error reporting
- **Debug Logging** — Verbose entrypoint script output
- **Hytale Backups** — In-game backup frequency and retention
- **Whitelist** — Enable and configure player whitelist
- **Skip Broken Mods** — Auto-quarantine failing mods
- **Max View Radius** — Chunk view distance
- **Additional Environment Variables** — Pass-through for any `HYTALE_*` option

#### 7. User and Group Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| User ID | `568` | Must match dataset ownership |
| Group ID | `568` | Must match dataset ownership |

> Minimum value is 568. TrueNAS uses UID/GID 568 by default for app containers.

#### 8. Network Configuration

| Port | Protocol | Default | Description |
|------|----------|---------|-------------|
| Game Port | UDP | `30520` | Hytale QUIC game traffic |
| API Port | TCP | `30080` | REST API for the Manager |
| Manager Port | TCP | `30300` | Web UI |

Each port supports bind modes: `published` (accessible from host), `exposed` (container-only), or `none`.

#### 9. Storage Configuration

**Primary data storage** — choose one:

| Type | Description |
|------|-------------|
| **ixVolume** (default) | TrueNAS-managed volume with automatic dataset creation |
| **Host Path** | Map to an existing ZFS dataset (e.g., `/mnt/tank/apps/hytale`) |

**Additional storage** — mount extra paths using host paths, ixVolume, SMB/CIFS, or NFS.

#### 10. Labels Configuration

Apply custom Docker labels to containers. Each label has a key, value, and target container selection (`hytale-server` and/or `hytale-manager`).

#### 11. Resources

| Setting | Default | Description |
|---------|---------|-------------|
| CPUs | `4` | CPU core limit |
| Memory (MB) | `12288` | Memory limit — should be at least 2 GB more than `JAVA_XMX` |

### Post-Installation

1. Check container logs for the OAuth authentication prompt
2. Complete the device code flow within 15 minutes
3. The server will download game files and start automatically
4. Access the Manager UI at `http://your-truenas-ip:30300`

---

## Custom App (Compose)

For users who prefer manual control, deploy using the `compose.yaml` directly.

### Steps

1. **Create a dataset:**

   ```bash
   zfs create tank/apps/hytale
   chown -R 568:568 /mnt/tank/apps/hytale
   ```

2. **Go to Apps > Discover Apps > Custom App**

3. **Click "Install via YAML"**

4. **Paste the contents of [`compose.yaml`](../hytale-docker-server/config-truenas/compose.yaml)**

5. **Update the volume path** to match your dataset:

   ```yaml
   volumes:
     - /mnt/tank/apps/hytale:/data:rw
   ```

6. **Set `API_CLIENT_SECRET`** to a secure password (used by both the server and manager):

   ```yaml
   x-api-config: &api-config
     API_CLIENT_SECRET: your-secure-password
   ```

7. **Deploy** and follow logs for the OAuth prompt.

---

## TrueNAS-Specific Considerations

### Why UID 568?

TrueNAS SCALE uses UID/GID 568 as the default for app containers. The Hytale server container uses `su-exec` to drop privileges from root to this user. All files written to `/data` are owned by 568:568.

If you use a different UID/GID:

- Set `PUID` and `PGID` environment variables to match
- Set `user:` in the compose file to match
- Ensure the dataset is owned by the same UID/GID

### ZFS Dataset Setup

```bash
# Create a dedicated dataset
zfs create tank/apps/hytale

# Set ownership
chown -R 568:568 /mnt/tank/apps/hytale

# Optional: Set ACLs if using ACL-enabled datasets
# TrueNAS UI: Datasets > Edit Permissions > Set UID 568, GID 568
```

For ACL-enabled datasets, ensure the `hytale` user (UID 568) has full control.

### Host Path vs ixVolume Storage

| Feature | Host Path | ixVolume |
|---------|-----------|----------|
| Dataset control | Full — you create and manage the dataset | TrueNAS auto-creates |
| Backup visibility | Direct access at known path | Managed by TrueNAS |
| Portability | Easy to migrate | Tied to TrueNAS app lifecycle |
| Recommended for | Production, manual management | Quick setup, testing |

### Docker Socket Access

The Manager container needs read-only access to the Docker socket for container control (start/stop/restart):

```yaml
volumes:
  - /var/run/docker.sock:/var/run/docker.sock:ro
group_add:
  - "0"  # Root group for socket access
```

The socket is mounted read-only. The container runs as UID 568 but is added to GID 0 (root group) to read the socket (which has `0:0` ownership with `660` permissions on TrueNAS).

### Resource Limits

Set container memory limits at least **2 GB higher** than `JAVA_XMX` to account for:

- JVM metaspace and off-heap memory
- Operating system overhead
- The entrypoint scripts and helper processes

Example: `JAVA_XMX=8G` → container memory limit = 10240 MB (10 GB).

### Log Management

Both containers use the `json-file` logging driver with size limits:

```yaml
logging:
  driver: json-file
  options:
    max-size: "50m"   # Server (larger due to game logs)
    max-file: "3"
```

```yaml
logging:
  driver: json-file
  options:
    max-size: "10m"   # Manager
    max-file: "3"
```

This prevents log files from consuming unlimited disk space on the ZFS pool.
