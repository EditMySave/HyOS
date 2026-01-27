---
name: build-api-plugin
description: Build and bundle the hytale-api-plugin REST/WebSocket plugin. Use when building the plugin JAR, modifying API endpoints, updating DTOs, fixing plugin bugs, or bundling for Docker deployment.
---

# Build hytale-api-plugin

Build the Hytale API Plugin - a Netty-based REST and WebSocket server that runs inside the Hytale game server.

## Project Paths

- Plugin source: `hytale-api-plugin/`
- Build output: `hytale-api-plugin/build/libs/hytale-api-1.0.0.jar`
- Target plugins dir: `hytale-docker-server/config-truenas/plugins/`
- HytaleServer.jar (compile dep): `hytale-docker-server/config-truenas/data/server/HytaleServer.jar`

## Build Commands

```bash
cd hytale-api-plugin

# Build the plugin JAR
./gradlew build

# Clean and rebuild (recommended after code changes)
./gradlew clean build

# Compile only (faster, for syntax checking)
./gradlew compileJava
```

Output: `build/libs/hytale-api-1.0.0.jar`

## Full Build & Bundle Workflow

The JAR must be copied to the Docker plugins directory before rebuilding the image:

```bash
cd hytale-api-plugin

# Build, copy to plugins, rebuild Docker
./gradlew clean build && \
cp build/libs/hytale-api-1.0.0.jar ../hytale-docker-server/config-truenas/plugins/ && \
cd ../hytale-docker-server/config-truenas && \
docker compose -f docker-compose.yml build --no-cache
```

**Critical**: The plugins directory is COPYed into the Docker image at build time. Without `--no-cache`, Docker may use cached layers with the old JAR.

## Build Requirements

- **Java 25** - Uses records, sealed interfaces, pattern matching, virtual threads
- **Gradle 9.2+** - Included via wrapper
- **HytaleServer.jar** - Must exist at `../hytale-docker-server/config-truenas/data/server/HytaleServer.jar`

If build fails with missing symbols (Netty, Gson, etc.), ensure HytaleServer.jar is present. All runtime deps are bundled in it.

## Threading: World Operations

Server operations that modify game state must run on the world's thread:

```java
// WRONG - will throw IllegalStateException
playerReference.getStore().putComponent(...);

// CORRECT - execute on world thread
world.execute(() -> {
    playerReference.getStore().putComponent(...);
});
```

The ECS Store validates thread ownership. HTTP handlers run on Netty threads, not world threads.

## Teleportation Pattern

From conversation debugging - the correct teleport pattern:

```java
var playerReference = playerRef.getReference();
var currentRotation = playerRef.getTransform().getRotation();

targetWorld.execute(() -> {
    playerReference.getStore().putComponent(
        playerReference,
        Teleport.getComponentType(),
        new Teleport(targetWorld, targetPosition, currentRotation)
    );
});
```

Key requirements:
1. Get `Ref<EntityStore>` via `playerRef.getReference()`
2. Execute on world thread via `world.execute()`
3. Use `store.putComponent()` not `holder.addComponent()`

## Handler Structure

Handlers organized by domain in `src/main/java/com/hytale/api/http/handlers/`:

| Handler | Endpoints |
|---------|-----------|
| `AuthHandler` | `/auth/token` |
| `StatusHandler` | `/server/status`, `/server/stats` |
| `PlayerExtendedHandler` | `/players/{uuid}/*` (teleport, gamemode, permissions) |
| `PlayerInventoryHandler` | `/players/{uuid}/inventory/*` |
| `WorldExtendedHandler` | `/worlds/{id}/*` (time, weather, blocks) |
| `AdminHandler` | `/admin/*` (command, kick, ban, broadcast) |

## Adding a New Endpoint

1. Add permission in `security/ApiPermissions.java`
2. Create request DTO in `dto/request/`
3. Add response record in `dto/response/ApiResponses.java`
4. Create/update handler in `http/handlers/`
5. Add route in `http/HttpRequestRouter.java`
6. Update `openapi.yaml`

## Config Generation

The plugin config is generated at container startup via `API_REGENERATE_CONFIG=true`:

```
Location: /data/mods/com.hytale_HytaleAPI/config.json
```

Client credentials are bcrypt-hashed. The Docker entrypoint reads `API_CLIENT_SECRET` (plaintext) and generates the hash.

To manually create config with bcrypt:

```bash
# Using Node.js (from server-manager)
cd server-manager/hyos-server-manager/next
node -e "const bcrypt=require('bcryptjs');console.log(bcrypt.hashSync('your-password',12))"
```

## Troubleshooting

### Build fails: missing HytaleServer.jar

```bash
# Verify file exists
ls -la ../hytale-docker-server/config-truenas/data/server/HytaleServer.jar

# If missing, start the Docker container once to download it
cd ../hytale-docker-server/config-truenas
docker compose -f docker-compose.yml up hyos
# Wait for download, then Ctrl+C
```

### Changes not reflected in running server

1. Verify JAR was copied to `plugins/`:
   ```bash
   ls -la ../hytale-docker-server/config-truenas/plugins/
   ```

2. Rebuild Docker with `--no-cache`:
   ```bash
   docker compose -f docker-compose.yml build --no-cache
   docker compose -f docker-compose.yml up --force-recreate -d
   ```

### NullPointerException in CorsConfig

The plugin's default config may have null CORS fields. Ensure `API_REGENERATE_CONFIG=true` in environment, or manually populate all CORS fields in config.json.

### IllegalStateException: Assert not in thread

Operations on ECS Store must run on the world thread. Wrap in `world.execute(() -> { ... })`.

### Authentication fails (401)

1. Check `API_CLIENT_SECRET` matches in both server and manager
2. Verify bcrypt hash in config.json matches plaintext password
3. Check JWT expiry (default 1 hour)

## OpenAPI Spec

The API is documented in `openapi.yaml`. Keep this in sync with Java DTOs when modifying endpoints. The server-manager uses this spec for TypeScript type generation.

## Related Skills

- **deploy-truenas**: Server container deployment, environment variables
- **deploy-server-manager**: Manager UI that consumes this API
