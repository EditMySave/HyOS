<p align="center">
  <img src="logo.png" alt="HyOS" width="200" height="100" />
</p>

<h3 align="center">HyOS</h3>
<p align="center">Docker-based Hytale server management with first-class TrueNAS support.</p>

<p align="center">
  <a href="https://github.com/editmysave/hyos/actions/workflows/ci.yml"><img src="https://github.com/editmysave/hyos/actions/workflows/ci.yml/badge.svg" alt="CI/CD" /></a>
  <a href="https://github.com/editmysave/hyos/pkgs/container/hyos%2Fserver"><img src="https://img.shields.io/badge/GHCR-server-blue?logo=docker" alt="Server Image" /></a>
  <a href="https://github.com/editmysave/hyos/pkgs/container/hyos%2Fmanager"><img src="https://img.shields.io/badge/GHCR-manager-blue?logo=docker" alt="Manager Image" /></a>
</p>

---

## What is HyOS?

HyOS is a multi-container system for running and managing Hytale dedicated servers. It pairs a game server container (automated setup, OAuth auth, auto-updates, mod management) with a Next.js web dashboard for remote administration. Designed for TrueNAS SCALE but works on any Docker host.

## Key Features

- **OAuth Authentication** — Device code flow with token caching, no manual credential management
- **Auto-Updates** — Checks for new server versions on startup and on a schedule
- **Mod Management** — Install from CurseForge, Modtale, and NexusMods; content-only mod patching
- **Web Dashboard** — Real-time server status, logs, console, player list, and mod management
- **REST API Plugin** — Embedded API plugin for programmatic server control
- **World Management** — Upload, swap, and manage world slots
- **Non-Root Execution** — Privilege dropping via `su-exec`, `no-new-privileges` security

## Quick Start

Create a `compose.yaml`:

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
      - "5520:5520/udp"
    volumes:
      - ./data:/data:rw
    stop_grace_period: 30s
```

```bash
docker compose up -d
docker logs -f hyos-server  # Complete OAuth when prompted
```

For the full setup with the Manager UI and API plugin, see the [Quick Start guide](docs/quickstart.md).

## Compatibility

| Requirement | Details |
|---|---|
| Architecture | x86_64 / amd64 only |
| Docker | Engine 24+ or Docker Desktop |
| TrueNAS SCALE | 24.10.2.2+ (optional, for native app deployment) |
| Hytale Account | Server hosting access required |
| RAM | 8 GB minimum, 12 GB+ recommended |
| Java | 25 (bundled in image, Eclipse Temurin) |
| Network | UDP 5520 (game), TCP 8080 (API), TCP 3000 (manager UI) |

## Architecture

HyOS runs two containers that share a single `/data` volume:

| Container | Image | Role |
|---|---|---|
| Hytale Server | `ghcr.io/editmysave/hyos/server` | Game server, entrypoint scripts, API plugin |
| HyOS Manager | `ghcr.io/editmysave/hyos/manager` | Next.js web dashboard, Docker socket for lifecycle control |

The server container handles authentication, updates, mod validation, and config generation before launching the Java process. The Manager reads state files from `/data/.state/` and communicates with the embedded API plugin over HTTP.

See [Architecture](docs/architecture.md) for diagrams and the full security model.

## Docker Images

| Image | Port | Protocol | Description |
|---|---|---|---|
| `ghcr.io/editmysave/hyos/server` | 5520 | UDP | Hytale game server (QUIC) |
| `ghcr.io/editmysave/hyos/server` | 8080 | TCP | REST API plugin |
| `ghcr.io/editmysave/hyos/manager` | 3000 | TCP | Web management UI |

## Documentation

| Document | Description |
|---|---|
| [Quick Start](docs/quickstart.md) | Get a server running in minutes |
| [Configuration Reference](docs/configuration.md) | Environment variables, memory tuning, config generation |
| [TrueNAS Deployment](docs/truenas-deployment.md) | TrueNAS SCALE native and custom app deployment |
| [Server Manager](docs/server-manager.md) | Web UI user guide |
| [Mods & Plugins](docs/mods-and-plugins.md) | Installing mods, content-only patching, API plugin |
| [Architecture](docs/architecture.md) | System design, diagrams, state files, security model |
| [Scripts Reference](docs/scripts-reference.md) | Entrypoint, library scripts, and command scripts |
| [Troubleshooting](docs/troubleshooting.md) | Common issues and solutions |

## Project Structure

```
HyOS/
├── hytale-docker-server/       # Docker configs for the game server
│   ├── config-truenas/         # TrueNAS-optimized build (primary)
│   ├── config-developer/       # Developer build with TypeScript/Bun
│   └── config-minimal/         # Lightweight build for testing
├── hytale-api-plugin/          # REST API plugin (Java, bundled in server image)
├── server-manager/             # Next.js web dashboard
├── .github/workflows/          # CI/CD pipeline (builds + publishes to GHCR)
└── README.md
```

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a pull request.

## License

See [LICENSE](LICENSE) for details.
