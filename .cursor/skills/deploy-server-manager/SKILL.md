---
name: deploy-server-manager
description: Build and deploy the hyos-server-manager Next.js web UI. Use when building the manager Docker image, bundling with config-truenas, running locally with docker-compose, or troubleshooting manager-to-server connectivity.
---

# Deploy hyos-server-manager

Build and deploy the HyOS Server Manager - a Next.js web UI for managing Hytale servers.

## Project Paths

- Manager source: `server-manager/hyos-server-manager/next/`
- Dockerfile: `server-manager/hyos-server-manager/next/Dockerfile`
- Local build compose: `hytale-docker-server/config-truenas/docker-compose.yml`
- Production compose: `hytale-docker-server/config-truenas/compose.yaml`

## Two-Service Architecture

The system deploys two containers that communicate:

```
┌─────────────────┐         REST API          ┌─────────────────┐
│   hyos-manager  │ ────────────────────────► │      hyos       │
│   (Next.js UI)  │    http://hyos:8080       │  (Game Server)  │
│   port 3000     │                           │  port 5520/udp  │
└────────┬────────┘                           │  port 8080/tcp  │
         │                                    └────────┬────────┘
         └──── /data/.state/ (shared, read-only) ─────┘
```

## Compose File Differences

| File | Purpose | Manager Image |
|------|---------|---------------|
| `compose.yaml` | Production (TrueNAS) | `ghcr.io/editmysave/hyos/manager:latest` (pulls from GHCR) |
| `docker-compose.yml` | Local build/test | Builds from local source |

**Important**: Always use `-f docker-compose.yml` for local builds:

```bash
# WRONG - uses compose.yaml, pulls from Docker Hub
docker compose build

# CORRECT - uses docker-compose.yml, builds locally
docker compose -f docker-compose.yml build
```

## Build Manager Image

### Local Development Build

```bash
cd hytale-docker-server/config-truenas

# Build both server and manager from source
docker compose -f docker-compose.yml build --no-cache

# Run locally
docker compose -f docker-compose.yml up -d

# View manager logs
docker logs -f hyos-manager
```

### Build Manager Only

```bash
cd server-manager/hyos-server-manager/next

# Build standalone
docker build -t hyos-manager:latest .

# Or with version tag
docker build -t hyos-manager:v1.0.0 .
```

### Publishing to GHCR

Production images are published automatically via GitHub Actions CI on push to `main`. No manual push needed.

| Image | Registry |
|-------|----------|
| Server | `ghcr.io/editmysave/hyos/server:latest` |
| Manager | `ghcr.io/editmysave/hyos/manager:latest` |

## Manager Configuration

### Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ADAPTER_TYPE` | `rest` | How manager connects: `rest` or `console` |
| `REST_API_URL` | - | Server API URL (e.g., `http://hyos:8080`) |
| `REST_API_CLIENT_ID` | - | Must match server's `API_CLIENT_ID` |
| `REST_API_CLIENT_SECRET` | - | Must match server's `API_CLIENT_SECRET` |
| `HYTALE_CONTAINER_NAME` | `hyos` | Docker container name for control |
| `HYTALE_STATE_DIR` | `/data/.state` | Path to state files |

### Credential Sync (YAML Anchors)

compose.yaml uses YAML anchors to keep credentials in sync:

```yaml
x-api-config: &api-config
  API_CLIENT_SECRET: ${API_CLIENT_SECRET:-changeme123}
  API_CLIENT_ID: ${API_CLIENT_ID:-hyos-manager}

services:
  hytale:
    environment:
      <<: *api-config  # Server uses these

  manager:
    environment:
      <<: *api-config  # Shared anchor
      REST_API_CLIENT_SECRET: ${API_CLIENT_SECRET:-changeme123}  # Map to manager var
      REST_API_CLIENT_ID: ${API_CLIENT_ID:-hyos-manager}
```

## Troubleshooting

### Manager can't connect to server

1. **Verify credentials match** - `API_CLIENT_SECRET` must be identical in both services
2. **Check REST API is running**:
   ```bash
   docker exec hyos curl -s http://localhost:8080/health
   ```
3. **Check network connectivity**:
   ```bash
   docker exec hyos-manager wget -qO- http://hyos:8080/health
   ```
4. **Verify adapter type**:
   ```bash
   docker exec hyos-manager printenv | grep ADAPTER
   # Should show: ADAPTER_TYPE=rest
   ```

### Manager shows "Offline" but server is running

The manager reads state files from `/data/.state/`. Check:

1. Volume is mounted correctly (`:ro` is fine)
2. State files exist:
   ```bash
   docker exec hyos-manager ls -la /data/.state/
   ```
3. Server is writing state files:
   ```bash
   docker exec hyos cat /data/.state/server.json
   ```

### Build fails: standalone output missing

Ensure `next.config.ts` has standalone output:

```typescript
const nextConfig: NextConfig = {
  output: "standalone",
};
```

### Port 3000 already in use

```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different port
docker run -p 3001:3000 hyos-manager:latest
```

### Changes not reflected after rebuild

Always use `--no-cache` when rebuilding:

```bash
docker compose -f docker-compose.yml build --no-cache
docker compose -f docker-compose.yml up --force-recreate -d
```

## Next.js Build Details

The Dockerfile uses a multi-stage build:

1. **deps**: Install pnpm and dependencies
2. **builder**: Build Next.js with standalone output
3. **runner**: Minimal production image

Key build requirements:
- Node 22 Alpine base
- pnpm for package management
- User 568:568 (TrueNAS apps user)
- Standalone output copies `.next/standalone` and `.next/static`

## Manager Adapters

The manager supports two adapter types:

### REST Adapter (Recommended)
Connects to the hytale-api REST plugin. Full control over server.

```bash
ADAPTER_TYPE=rest
REST_API_URL=http://hyos:8080
REST_API_CLIENT_ID=hyos-manager
REST_API_CLIENT_SECRET=your-password
```

### Console Adapter (Fallback)
Uses Docker exec to send console commands. Limited functionality.

```bash
ADAPTER_TYPE=console
HYTALE_CONTAINER_NAME=hyos
```

## Local Development (No Docker)

For rapid iteration on the manager UI:

```bash
cd server-manager/hyos-server-manager/next

# Install dependencies
pnpm install

# Set environment
export ADAPTER_TYPE=rest
export REST_API_URL=http://localhost:8080
export REST_API_CLIENT_ID=hyos-manager
export REST_API_CLIENT_SECRET=your-password

# Run dev server
pnpm dev
```

## Full Deployment Checklist

```
Deployment Checklist:
- [ ] CI passing on main (images auto-published to GHCR)
- [ ] API_CLIENT_SECRET set (min 8 chars)
- [ ] Volume path updated (/mnt/tank/apps/hytale)
- [ ] Ports available (5520/udp, 8080/tcp, 3000/tcp)
- [ ] User 568:568 owns data directory
```

## Related Skills

- **deploy-truenas**: Hytale server container deployment, environment config
- **build-api-plugin**: Building the REST API plugin JAR
