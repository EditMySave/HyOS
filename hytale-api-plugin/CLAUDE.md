# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
# Build the plugin JAR
./gradlew build

# Clean and rebuild
./gradlew clean build

# Compile only (faster, no JAR packaging)
./gradlew compileJava
```

The output JAR is placed in `build/libs/hytale-api-1.0.0.jar`.

## Project Overview

Hytale API Plugin is a Netty-based REST and WebSocket server that runs as a plugin inside a Hytale game server. It provides authenticated API access for server management and real-time event streaming.

**Java Version:** 25 (uses pattern matching, records, sealed interfaces, virtual threads)

**Dependencies:** All runtime dependencies (Netty, Nimbus JOSE JWT, Gson) are bundled in HytaleServer.jar and accessed via `compileOnly`.

## Architecture

### Entry Point
`ApiPlugin` extends `JavaPlugin` from the Hytale server SDK. Lifecycle: `setup()` → `start()` → `shutdown()`.

### HTTP Layer (Netty Pipeline)
```
SocketChannel
  └─ SslHandler (optional TLS)
  └─ IdleStateHandler
  └─ HttpServerCodec
  └─ ChunkedWriteHandler
  └─ HttpObjectAggregator
  └─ RateLimitMiddleware
  └─ WebSocketServerProtocolHandler (handles /ws upgrade)
  └─ WebSocketHandler
  └─ HttpRequestRouter
```

`ApiChannelInitializer` assembles this pipeline. All handlers marked `@Sharable` are singleton instances.

### Request Routing
`HttpRequestRouter` uses regex patterns and Java 21 pattern matching to dispatch requests:
- Public endpoints: `/health`, `/auth/token`
- Protected endpoints require Bearer JWT in Authorization header
- Path parameters extracted via regex groups (e.g., `/players/{uuid}`)

### Authentication Flow
1. Client POSTs credentials to `/auth/token`
2. `AuthHandler` validates via bcrypt, returns signed JWT (RS256)
3. Subsequent requests include `Authorization: Bearer <token>`
4. `TokenGenerator` validates signature, expiry, issuer
5. `ClientIdentity` record carries permissions through request lifecycle

### Permission System
Hierarchical wildcards defined in `ApiPermissions`:
- `api.*` grants all
- `api.admin.*` grants all admin actions
- Specific: `api.players.read`, `api.admin.kick`, etc.

Checked via `ClientIdentity.hasPermission()` and `ApiPermissions.matches()`.

### WebSocket Events
`EventBroadcaster` subscribes to Hytale server events and pushes to WebSocket clients:
- `player.connect`, `player.join`, `player.leave` - Connection lifecycle
- `player.chat` - Chat messages
- `player.gamemode` - Game mode changes
- `entity.remove` - Entity removal
- `server.status` - Periodic status (via virtual thread scheduler)
- `server.log` - Real-time server log streaming (via `LogBroadcaster`)

Clients authenticate via `{"type":"auth","token":"..."}` message, then subscribe with `{"type":"subscribe","events":["player.*","server.log"]}`.

### Configuration
`ApiConfig` is a record hierarchy loaded from `config.json` in `mods/com.hytale_HytaleAPI/`. Nested records: `TlsConfig`, `JwtConfig`, `ClientConfig`, `RateLimitConfig`, `CorsConfig`, `WebSocketConfig`, `AuditConfig`.

### Error Handling
`ApiException` is a sealed class with typed subclasses: `BadRequest`, `Unauthorized`, `Forbidden`, `NotFound`, `InternalError`, `RateLimited`. Each produces consistent JSON error responses.

## Key Patterns

- **Records for DTOs:** All request/response types in `dto/` are records
- **Sealed interfaces:** `ValidatedToken` uses sealed interface with `Valid`, `Invalid`, `Expired` cases
- **Pattern matching:** Switch expressions in router and handlers destructure sealed types
- **Sharable handlers:** Netty handlers marked `@Sharable` are thread-safe singletons

## API Endpoints

### Public
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| POST | /auth/token | Obtain JWT token |

### Server Management
| Method | Path | Permission |
|--------|------|------------|
| GET | /server/status | api.status.read |
| GET | /server/stats | api.status.read |
| GET | /server/version | api.version.read |
| GET | /server/metrics | api.server.metrics.read |
| GET | /server/plugins | api.server.plugins.read |
| POST | /server/whitelist | api.server.whitelist.write |
| POST | /server/save | api.server.save |

### Players
| Method | Path | Permission |
|--------|------|------------|
| GET | /players | api.players.read |
| GET | /players/{uuid} | api.players.read |
| GET | /players/{uuid}/stats | api.players.stats.read |
| GET | /players/{uuid}/location | api.players.location.read |
| POST | /players/{uuid}/teleport | api.players.teleport |
| GET | /players/{uuid}/gamemode | api.players.gamemode.read |
| POST | /players/{uuid}/gamemode | api.players.gamemode.write |
| GET | /players/{uuid}/permissions | api.players.permissions.read |
| POST | /players/{uuid}/permissions | api.players.permissions.write |
| DELETE | /players/{uuid}/permissions/{perm} | api.players.permissions.write |
| GET | /players/{uuid}/groups | api.players.groups.read |
| POST | /players/{uuid}/groups | api.players.groups.write |
| POST | /players/{uuid}/message | api.players.message |

### Player Inventory
| Method | Path | Permission |
|--------|------|------------|
| GET | /players/{uuid}/inventory | api.players.inventory.read |
| GET | /players/{uuid}/inventory/hotbar | api.players.inventory.read |
| GET | /players/{uuid}/inventory/armor | api.players.inventory.read |
| GET | /players/{uuid}/inventory/storage | api.players.inventory.read |
| POST | /players/{uuid}/inventory/give | api.players.inventory.write |
| POST | /players/{uuid}/inventory/clear | api.players.inventory.write |

### Worlds
| Method | Path | Permission |
|--------|------|------------|
| GET | /worlds | api.worlds.read |
| GET | /worlds/{id} | api.worlds.read |
| GET | /worlds/{id}/stats | api.worlds.read |
| GET | /worlds/{id}/time | api.worlds.time.read |
| POST | /worlds/{id}/time | api.worlds.time.write |
| GET | /worlds/{id}/weather | api.worlds.weather.read |
| POST | /worlds/{id}/weather | api.worlds.weather.write |
| GET | /worlds/{id}/entities | api.worlds.entities.read |
| GET | /worlds/{id}/blocks/{x}/{y}/{z} | api.worlds.blocks.read |
| POST | /worlds/{id}/blocks/{x}/{y}/{z} | api.worlds.blocks.write |

### Admin & Chat
| Method | Path | Permission |
|--------|------|------------|
| POST | /admin/command | api.admin.command |
| POST | /admin/kick | api.admin.kick |
| POST | /admin/ban | api.admin.ban |
| POST | /admin/broadcast | api.admin.broadcast |
| POST | /chat/mute/{uuid} | api.chat.mute |

## OpenAPI Specification

The API is documented in `openapi.yaml` at the project root. This spec is used to generate TypeScript types for API consumers.

**IMPORTANT:** When modifying endpoints or DTOs:
1. Update the corresponding Java code in `dto/request/` or `dto/response/`
2. Update `openapi.yaml` to match the changes

The OpenAPI spec must stay in sync with the Java implementation. Key files:
- `dto/request/*.java` - Request DTOs
- `dto/response/ApiResponses.java` - Response DTOs
- `openapi.yaml` - API specification (source of truth for client type generation)

## Handler Structure

Handlers are organized by domain:
- `AuthHandler` - Token generation
- `StatusHandler` - Server status and stats
- `VersionHandler` - Version information
- `PlayerHandler` - Basic player listing
- `PlayerExtendedHandler` - Stats, location, teleport, gamemode, permissions
- `PlayerInventoryHandler` - Inventory management
- `WorldHandler` - World listing and details
- `WorldExtendedHandler` - Time, weather, entities, blocks
- `ServerExtendedHandler` - Metrics, plugins, whitelist, save
- `ChatHandler` - Chat muting
- `AdminHandler` - Commands, kick, ban, broadcast
