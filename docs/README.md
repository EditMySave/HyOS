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

- **GHCR**: [`ghcr.io/editmysave/hyos/server`](https://github.com/editmysave/hyos/pkgs/container/hyos%2Fserver)
- **Game Server Port**: UDP 30520 (container: 5520)
- **REST API Port**: TCP 30358 (container: 8080)
- **Manager UI Port**: TCP 30359 (container: 3000)

> Host ports use the 30xxx range to avoid conflicts with other TrueNAS apps. The default Hytale server port is UDP 5520 — you can override the host ports if no conflicts exist on your system.
