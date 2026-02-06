# Hytale Server - TrueNAS SCALE Configuration

Enterprise-grade Hytale server configuration optimized for TrueNAS SCALE Custom Apps, featuring automated OAuth authentication, auto-updates, mod management with content-only patching, a REST API plugin, and a web-based management UI.

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

## Documentation

For detailed documentation, see the [docs/](docs/) directory:

| Document | Description |
|----------|-------------|
| [Quick Start](docs/quickstart.md) | Detailed getting started guide |
| [Configuration Reference](docs/configuration.md) | All environment variables, memory tuning, config generation modes |
| [TrueNAS Deployment](docs/truenas-deployment.md) | Native TrueNAS app and custom app deployment |
| [Server Manager](docs/server-manager.md) | HyOS Manager web UI user guide |
| [Mods & Plugins](docs/mods-and-plugins.md) | Installing mods, content-only patching, API plugin |
| [Scripts Reference](docs/scripts-reference.md) | Entrypoint, library scripts, and command scripts |
| [Architecture](docs/architecture.md) | System design, diagrams, state files, security model |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |
