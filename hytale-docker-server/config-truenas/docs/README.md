# HyOS Documentation

Comprehensive documentation for the HyOS Hytale Server Docker image — an enterprise-grade, self-hosted Hytale dedicated server optimized for TrueNAS SCALE.

HyOS provides automated server management including OAuth authentication, auto-updates, mod support with content-only mod patching, a REST API plugin for remote management, and a full-featured web UI (HyOS Manager).

## Prerequisites

- **Docker** (Docker Engine 24+ or Docker Desktop)
- **TrueNAS SCALE 24.10.2.2+** (for TrueNAS deployment) or any Docker-capable host
- **Hytale Account** with server hosting access
- **8 GB RAM minimum** (12 GB+ recommended)
- **x86_64/amd64 architecture** (ARM is not supported)

## Documentation

| Document | Description |
|----------|-------------|
| [Quick Start](quickstart.md) | Get a server running in minutes |
| [Configuration Reference](configuration.md) | All environment variables, memory tuning, config generation |
| [TrueNAS Deployment](truenas-deployment.md) | TrueNAS SCALE native app and custom app deployment |
| [Server Manager](server-manager.md) | HyOS Manager web UI user guide |
| [Mods & Plugins](mods-and-plugins.md) | Installing mods, content-only patching, API plugin |
| [Scripts Reference](scripts-reference.md) | Entrypoint, library scripts, and command scripts |
| [Architecture](architecture.md) | System design, diagrams, state files, security model |
| [Troubleshooting](troubleshooting.md) | Common issues and solutions |

## Quick Links

- **Docker Hub**: [`riceheadv8/hyos`](https://hub.docker.com/r/riceheadv8/hyos)
- **Game Server Port**: UDP 5520
- **REST API Port**: TCP 8080
- **Manager UI Port**: TCP 3000
