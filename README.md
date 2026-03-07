<p align="center">
  <img src="logo.png" alt="HyOS" width="200" />
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

<details>
<summary><strong>Docker Compose (Linux / macOS / Windows)</strong></summary>

Create a `compose.yaml`:

```yaml
x-api-config: &api-config
  API_CLIENT_SECRET: ${API_CLIENT_SECRET:-changeme123}   # change me!
  API_CLIENT_ID: ${API_CLIENT_ID:-hyos-manager}

services:
  server:
    image: ghcr.io/editmysave/hyos/server:latest
    container_name: hyos-server
    user: "568:568"
    restart: unless-stopped
    stdin_open: true
    tty: true
    environment:
      <<: *api-config
      PUID: 568
      PGID: 568
      SERVER_NAME: "My Hytale Server"
      MAX_PLAYERS: 100
      DEFAULT_GAMEMODE: Adventure
      API_ENABLED: "true"
      API_WEBSOCKET_ENABLED: "true"
      API_REGENERATE_CONFIG: "true"
    ports:
      - "5520:5520/udp"
      - "30381:30381/tcp"
    volumes:
      - ./data:/data:rw
    healthcheck:
      test: ["CMD", "/opt/scripts/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true

  manager:
    image: ghcr.io/editmysave/hyos/manager:latest
    container_name: hyos-manager
    user: "568:568"
    group_add: ["0"]
    restart: unless-stopped
    environment:
      <<: *api-config
      NODE_ENV: production
      ADAPTER_TYPE: rest
      HYTALE_CONTAINER_NAME: server
      HYTALE_STATE_DIR: /data/.state
      HYTALE_SERVER_HOST: server
      HYTALE_SERVER_PORT: "30381"
      COOKIE_SECURE: "false"
    ports:
      - "3000:3000"
    volumes:
      - ./data:/data:rw
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - server
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true
```

```bash
docker compose up -d
docker logs -f hyos-server  # Complete OAuth when prompted
```

</details>

<details>
<summary><strong>TrueNAS SCALE (Custom App)</strong></summary>

Create a Custom App in **Apps → Discover → Custom App** with this `compose.yaml`:

```yaml
x-api-config: &api-config
  API_CLIENT_SECRET: changeme123   # change me!
  API_CLIENT_ID: hyos-manager

services:
  server:
    image: ghcr.io/editmysave/hyos/server:latest
    container_name: hyos-server
    user: "568:568"
    restart: unless-stopped
    pull_policy: always
    stdin_open: true
    tty: true
    environment:
      <<: *api-config
      PUID: 568
      PGID: 568
      JAVA_XMS: 4G
      JAVA_XMX: 8G
      SERVER_NAME: "My Hytale Server"
      MAX_PLAYERS: 100
      DEFAULT_GAMEMODE: Adventure
      PATCHLINE: release
      API_ENABLED: "true"
      API_WEBSOCKET_ENABLED: "true"
      API_REGENERATE_CONFIG: "true"
    ports:
      - "30380:5520/udp"
      - "30381:30381/tcp"
    volumes:
      - /mnt/pool/apps/hyos/data:/data:rw
    healthcheck:
      test: ["CMD", "/opt/scripts/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    stop_grace_period: 30s
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true
    deploy:
      resources:
        limits:
          cpus: "4"
          memory: 12288M

  manager:
    image: ghcr.io/editmysave/hyos/manager:latest
    container_name: hyos-manager
    user: "568:568"
    group_add: ["0"]
    restart: unless-stopped
    pull_policy: always
    environment:
      <<: *api-config
      NODE_ENV: production
      ADAPTER_TYPE: rest
      HYTALE_CONTAINER_NAME: server
      HYTALE_STATE_DIR: /data/.state
      HYTALE_SERVER_HOST: server
      HYTALE_SERVER_PORT: "30381"
      COOKIE_SECURE: "false"
    ports:
      - "30382:3000"
    volumes:
      - /mnt/pool/apps/hyos/data:/data:rw
      - /var/run/docker.sock:/var/run/docker.sock:rw
    depends_on:
      - server
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
    security_opt:
      - no-new-privileges:true
```

> **Note:** Replace `/mnt/pool/apps/hyos/data` with your actual dataset path. For the native TrueNAS app catalog (with the full configuration UI), see [config-truenas/SETUP.md](hytale-docker-server/config-truenas/SETUP.md).

</details>

For the full configuration reference, see the [Quick Start guide](website/content/docs/getting-started/index.mdx).

## Compatibility

| Requirement | Details |
|---|---|
| Architecture | x86_64 / amd64 only |
| Docker | Engine 24+ or Docker Desktop |
| TrueNAS SCALE | 24.10.2.2+ (optional, for native app deployment) |
| Hytale Account | Server hosting access required |
| RAM | 8 GB minimum, 12 GB+ recommended |
| Java | 25 (bundled in image, Eclipse Temurin) |
| Network | UDP 5520 (game), TCP 30381 (API), TCP 3000 (manager UI) |

## Architecture

HyOS runs two containers that share a single `/data` volume:

| Container | Image | Ports | Role |
|---|---|---|---|
| Hytale Server | `ghcr.io/editmysave/hyos/server` | 5520/UDP, 30381/TCP | Game server (QUIC), REST API plugin |
| HyOS Manager | `ghcr.io/editmysave/hyos/manager` | 3000/TCP | Next.js web dashboard, Docker socket for lifecycle control |

The server container handles authentication, updates, mod validation, and config generation before launching the Java process. The Manager reads state files from `/data/.state/` and communicates with the embedded API plugin over HTTP.

See [Architecture](website/content/docs/architecture/overview.mdx) for diagrams and data flow. For the security model, see [Security](website/content/docs/security/index.mdx).

## Documentation

| Document | Description |
|---|---|
| [Quick Start](website/content/docs/getting-started/index.mdx) | Get a server running in minutes |
| [Configuration Reference](website/content/docs/configuration/index.mdx) | Environment variables, memory tuning, config generation |
| [TrueNAS Deployment](website/content/docs/deployment/truenas.mdx) | TrueNAS SCALE native and custom app deployment |
| [Server Manager](website/content/docs/server-management/dashboard.mdx) | Web UI user guide |
| [Mods & Plugins](website/content/docs/mods/index.mdx) | Installing mods, content-only patching, API plugin |
| [Architecture](website/content/docs/architecture/overview.mdx) | System design, diagrams, state files, security model |
| [Security](website/content/docs/security/index.mdx) | Authentication, hardening, and known limitations |
| [Scripts Reference](website/content/docs/scripts-reference/index.mdx) | Entrypoint, library scripts, and command scripts |
| [Troubleshooting](website/content/docs/troubleshooting/index.mdx) | Common issues and solutions |

## Project Structure

```
HyOS/
├── hytale-docker-server/       # Docker configs for the game server
│   ├── config-truenas/         # TrueNAS-optimized build (primary)
│   ├── config-developer/       # Developer build with TypeScript/Bun
│   ├── config-minimal/         # Lightweight build for testing
│   └── truenas-app/            # TrueNAS SCALE app metadata
├── hytale-api-plugin/          # REST API plugin (Java, bundled in server image)
├── server-manager/             # Next.js web dashboard
├── website/                    # Documentation site (Fumadocs)
├── .github/workflows/          # CI/CD pipeline (builds + publishes to GHCR)
└── README.md
```

## Contributing

Contributions are welcome. Please open an issue to discuss changes before submitting a pull request.

## License

See [LICENSE](LICENSE) for details.
