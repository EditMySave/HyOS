---
name: deploy-truenas
description: Build and deploy the hytale-docker-server config-truenas Docker image. Use when building Docker images, deploying to TrueNAS SCALE, running locally with docker-compose, configuring the REST API plugin, or troubleshooting the Hytale server container.
---

# Deploy config-truenas

Build and deploy the Hytale server Docker image optimized for TrueNAS SCALE.

## Project Paths

- Config directory: `hytale-docker-server/config-truenas/`
- Dockerfile: `hytale-docker-server/config-truenas/Dockerfile`
- Docker Compose: `hytale-docker-server/config-truenas/compose.yaml`
- Scripts: `hytale-docker-server/config-truenas/scripts/`
- Plugins: `hytale-docker-server/config-truenas/plugins/`
- Setup docs: `hytale-docker-server/config-truenas/SETUP.md`

## Build Docker Image

```bash
cd hytale-docker-server/config-truenas

# Build for local testing
docker build -t hyos:dev .

# Build with version tag
docker build -t riceheadv8/hyos:truenas-v12 .

# Build and push to Docker Hub
docker build -t riceheadv8/hyos:latest .
docker push riceheadv8/hyos:latest
```

## Multi-Architecture Publish (buildx)

HyOS server is **amd64 only** (Hytale downloader is amd64). Use buildx for reproducible Hub publish:

```bash
cd hytale-docker-server/config-truenas
docker buildx build --builder multiarch --platform linux/amd64 --no-cache \
  -t riceheadv8/hyos:latest --push -f Dockerfile .
```

For **manager** multi-arch (amd64 + arm64), see **deploy-server-manager** skill.

## Build API Plugin

The hytale-api plugin enables REST API access. See **build-api-plugin** skill for full details.

Quick build:
```bash
cd hytale-api-plugin
./gradlew clean build
cp build/libs/hytale-api-1.0.0.jar ../hytale-docker-server/config-truenas/plugins/
```

## Local Development

```bash
cd hytale-docker-server/config-truenas

# Create data directory with correct permissions
mkdir -p ./data
chmod 755 ./data

# Run both server and manager
docker compose up -d

# View server logs
docker logs -f hyos

# View manager logs
docker logs -f hyos-manager

# Stop all
docker compose down
```

## Deploy to TrueNAS SCALE

### 1. Deploy via Custom App

1. Go to **Apps → Discover Apps → Custom App → Install via YAML**
2. Paste contents of `compose.yaml`
3. Update volume path: `/mnt/tank/apps/hytale:/data:rw`
4. Set `API_CLIENT_SECRET` to a secure password (min 8 chars)
5. Deploy

### 2. Complete OAuth

Monitor logs for the OAuth URL and complete authentication within 15 minutes.

## Two-Service Architecture

The compose.yaml deploys two services:

| Service | Image | Ports | Purpose |
|---------|-------|-------|---------|
| `hytale` | `riceheadv8/hyos:latest` | 5520/udp, 8080/tcp | Game server + REST API |
| `manager` | `riceheadv8/hyos-manager:latest` | 3000/tcp | Web UI |

### Service Communication

```
┌─────────────┐     REST API      ┌─────────────┐
│   Manager   │ ───────────────── │   Hytale    │
│  (port 3000)│   http://hytale:8080  │ (port 5520) │
└─────────────┘                   └─────────────┘
       │                                 │
       └──── /data/.state/ (shared) ────┘
```

## API Configuration

**Critical**: Both services must use matching credentials.

```yaml
# In hytale service:
API_CLIENT_ID: hyos-manager
API_CLIENT_SECRET: your-secure-password  # Plaintext, gets bcrypt hashed

# In manager service:
REST_API_CLIENT_ID: hyos-manager
REST_API_CLIENT_SECRET: your-secure-password  # Must match exactly
```

The compose.yaml uses YAML anchors to sync these automatically:

```yaml
x-api-config: &api-config
  API_CLIENT_SECRET: ${API_CLIENT_SECRET:-changeme123}
  API_CLIENT_ID: ${API_CLIENT_ID:-hyos-manager}
```

## Key Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PUID` | `568` | User ID (match dataset owner) |
| `PGID` | `568` | Group ID (match dataset owner) |
| `JAVA_XMS` | `4G` | Initial heap size |
| `JAVA_XMX` | `8G` | Maximum heap size |
| `SERVER_PORT` | `5520` | UDP game port |
| `API_ENABLED` | `true` | Enable REST API plugin |
| `API_PORT` | `8080` | REST API HTTP port |
| `API_CLIENT_SECRET` | - | API password (required) |
| `API_WEBSOCKET_ENABLED` | `true` | Enable WebSocket events |
| `PATCHLINE` | `release` | Version: release/staging/nightly |
| `ADAPTER_TYPE` | `rest` | Manager adapter: rest/console |

## TrueNAS Best Practices

### Resource Limits (Recommended)

```yaml
deploy:
  resources:
    limits:
      cpus: '4.0'
      memory: 10G
    reservations:
      cpus: '2.0'
      memory: 4G
```

### Security Hardening

```yaml
security_opt:
  - no-new-privileges:true
cap_drop:
  - ALL
```

### Clean Shutdown

Already configured with `stop_grace_period: 30s` for world save.

## Volume Structure

```
/data/
├── server/           # Server JAR and config
│   ├── HytaleServer.jar
│   ├── HytaleServer.aot  # AOT cache
│   ├── config.json
│   └── mods/         # Installed plugins
├── .auth/            # OAuth tokens
│   └── tokens.json
├── .state/           # State files for Web UI
│   ├── server.json
│   ├── version.json
│   ├── auth.json
│   ├── config.json
│   └── health.json
├── backups/          # Auto backups
├── mods/             # Custom mods (user-provided)
└── universe/         # World data
```

## Useful Commands

```bash
# Check server status (JSON output)
docker exec hyos /opt/scripts/cmd/status.sh --json

# Manual health check
docker exec hyos /opt/scripts/healthcheck.sh

# Re-authenticate
docker exec -it hyos /opt/scripts/cmd/auth-init.sh

# Check for updates
docker exec hyos /opt/scripts/cmd/update.sh --check

# Force update with backup
docker exec hyos /opt/scripts/cmd/update.sh --backup --force

# View state files
docker exec hyos cat /data/.state/server.json
docker exec hyos cat /data/.state/auth.json
```

## Troubleshooting

### Container exits immediately

1. Check permissions: `ls -la /mnt/tank/apps/hytale`
2. Ensure owner is 568:568: `chown -R 568:568 /mnt/tank/apps/hytale`
3. Check logs: `docker logs hyos`
4. Verify architecture is x86_64 (ARM not supported)

### Authentication fails

1. Don't restart during OAuth flow (15 min timeout)
2. Clear tokens and restart:
   ```bash
   rm /data/.auth/tokens.json
   docker restart hyos
   ```

### Server won't start

1. Check memory: `JAVA_XMX` must fit in available RAM
2. Check port: UDP 5520 must be free
3. View state: `cat /data/.state/server.json`

### Manager can't connect to server

1. Verify `API_CLIENT_SECRET` matches in both services
2. Check REST API is running: `curl http://localhost:8080/health`
3. Ensure manager uses `ADAPTER_TYPE=rest`
4. Check network: both containers must be on same Docker network

### Game files re-download every restart

1. Check `/data/server/` exists with correct permissions
2. Verify `HytaleServer.jar` is present
3. Ensure volume mount is persistent (not tmpfs)

### API plugin not loading

1. Verify JAR exists: `ls /data/server/mods/`
2. Check `API_ENABLED=true` in environment
3. Review server logs for plugin errors
4. Ensure `API_REGENERATE_CONFIG=true` if changing credentials

## Related Skills

- **deploy-server-manager**: Next.js web UI container (manager build, adapter config)
- **build-api-plugin**: Building the REST API plugin JAR
