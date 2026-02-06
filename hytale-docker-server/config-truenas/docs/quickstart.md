# Quick Start

Get a Hytale dedicated server running in minutes.

## 1. Create a Dataset

Create a ZFS dataset (or directory) for server data and set ownership to UID/GID 568 (TrueNAS default apps user):

```bash
# TrueNAS SCALE
zfs create tank/apps/hytale
chown -R 568:568 /mnt/tank/apps/hytale

# Generic Docker host
mkdir -p /opt/hytale
chown -R 568:568 /opt/hytale
```

## 2. Deploy with Docker Compose

Create a `compose.yaml` with the following minimal configuration:

```yaml
services:
  hytale:
    image: ghcr.io/editmysave/hyos/server:latest
    container_name: hyos-server
    user: "568:568"
    restart: unless-stopped
    stdin_open: true
    tty: true
    environment:
      PUID: 568
      PGID: 568
      JAVA_XMS: 4G
      JAVA_XMX: 8G
      SERVER_NAME: "My Hytale Server"
    ports:
      - "30520:5520/udp"
    volumes:
      - /mnt/tank/apps/hytale:/data:rw
    stop_grace_period: 30s
```

Deploy:

```bash
docker compose up -d
```

> For the full compose file with the Manager UI and API plugin, see the [compose.yaml](../compose.yaml) in the repository root.

## 3. Complete Authentication

On first run, the container will pause and display an OAuth authentication prompt in the logs:

```bash
docker logs -f hyos-server
```

```
╔══════════════════════════════════════════════════════════════╗
║                    AUTHENTICATION REQUIRED                    ║
╠══════════════════════════════════════════════════════════════╣
║  Visit: https://oauth.accounts.hytale.com/oauth2/device/...  ║
║  Code: ABC123XY                                               ║
╚══════════════════════════════════════════════════════════════╝
```

1. Open the URL in your browser
2. Enter the code shown
3. Authorize with your Hytale account

> **Important**: Do not restart the container during authentication. You have 15 minutes to complete the flow. Tokens are cached in `/data/.auth/` for subsequent restarts.

Once authenticated, the server will download game files (first run only) and start automatically.

## Verify the Server is Running

```bash
# Check container health
docker inspect --format='{{.State.Health.Status}}' hyos-server

# View full status
docker exec hyos-server /opt/scripts/cmd/status.sh
```

## What's Next

- [Configuration Reference](configuration.md) — Tune memory, game settings, and auto-updates
- [TrueNAS Deployment](truenas-deployment.md) — Deploy as a native TrueNAS SCALE app
- [Server Manager](server-manager.md) — Set up the web management UI
- [Mods & Plugins](mods-and-plugins.md) — Install and manage mods
- [Troubleshooting](troubleshooting.md) — Fix common issues
