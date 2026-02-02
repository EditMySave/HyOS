# Planned Features & Future Improvements

This document outlines potential improvements and new features for the Hytale API Plugin.

## Quick Wins (Low Complexity, High Impact)

### 1. GZIP Compression
**Status:** Not implemented
**Complexity:** Low | **Impact:** High

Add HTTP response compression to reduce payload sizes by 60-80%.

```java
// In ApiChannelInitializer.java pipeline
pipeline.addLast("httpCompressor", new HttpContentCompressor());
```

---

### 2. IP Whitelist/Blacklist
**Status:** Not implemented
**Complexity:** Low | **Impact:** High

Allow/block access based on IP addresses with CIDR support.

**Configuration:**
```json
{
  "ipFilter": {
    "enabled": true,
    "whitelist": ["192.168.1.0/24", "10.0.0.0/8"],
    "blacklist": ["203.0.113.50"],
    "allowPrivate": true
  }
}
```

**Files to create:**
- `IpFilterConfig.java` - Configuration record
- `IpFilterMiddleware.java` - Netty handler

---

### 3. Prometheus Metrics Endpoint
**Status:** Not implemented
**Complexity:** Medium | **Impact:** High

Expose metrics for monitoring systems (Prometheus, Grafana).

**Endpoint:** `GET /metrics`

**Metrics to track:**
- `hytale_api_requests_total{method,path,status}` - Request count
- `hytale_api_request_duration_seconds{method,path}` - Latency histogram
- `hytale_api_rate_limit_violations_total` - Rate limit hits
- `hytale_api_websocket_connections_active` - Active WebSocket connections
- `hytale_api_auth_failures_total{reason}` - Authentication failures

**Files to create:**
- `MetricsCollector.java` - Collect and store metrics
- `MetricsMiddleware.java` - Record per-request metrics
- `MetricsHandler.java` - Export Prometheus format

---

### 4. Pagination for List Endpoints
**Status:** Not implemented
**Complexity:** Medium | **Impact:** High

Add pagination support for endpoints returning lists.

**Query parameters:**
```
GET /players?offset=0&limit=25&sort=name&order=asc
```

**Response headers:**
```
X-Total-Count: 250
X-Page-Count: 10
X-Has-Next: true
Link: </players?offset=25&limit=25>; rel="next"
```

**Files to create:**
- `PaginationParams.java` - Parse query parameters
- Update handlers to support pagination

---

### 5. Request ID Tracking
**Status:** Not implemented
**Complexity:** Low | **Impact:** Medium

Generate unique request IDs for debugging and log correlation.

**Response header:** `X-Request-ID: 550e8400-e29b-41d4-a716-446655440000`

**Files to create:**
- `RequestIdMiddleware.java` - Generate and attach request ID

---

### 6. Per-Client Rate Limiting
**Status:** Partial (IP-based only)
**Complexity:** Medium | **Impact:** High

Enhance rate limiting to track by client ID, not just IP address.

**Current issue:** Clients can bypass rate limits by rotating IPs.

**Solution:**
```java
String rateKey = identity != null
    ? "client:" + identity.clientId()  // Authenticated
    : "ip:" + clientIp;                 // Unauthenticated
```

**Files to modify:**
- `RateLimitMiddleware.java`
- `RateLimiter.java`

---

## Medium Effort Features

### 7. OpenAPI/Swagger Documentation
**Status:** Not implemented
**Complexity:** Medium | **Impact:** High

Auto-generate API documentation from code annotations.

**Endpoints:**
- `GET /api-docs/openapi.json` - OpenAPI 3.0 spec
- `GET /api-docs/` - Swagger UI

**Files to create:**
- `@ApiEndpoint`, `@ApiResponse`, `@ApiParameter` annotations
- `OpenApiGenerator.java` - Generate spec from annotations
- Swagger UI static assets

---

### 8. Filtering & Sorting Query Parameters
**Status:** Not implemented
**Complexity:** Medium | **Impact:** High

Allow filtering and sorting on list endpoints.

**Examples:**
```
GET /players?name=Steve&world=world_1&minHealth=50
GET /players?sort=name,connectedTime&order=asc,desc
GET /worlds?type=nether
```

**Files to create:**
- `FilterParams.java` - Parse filter query parameters
- `SortParams.java` - Parse sort parameters
- Update handlers to apply filters

---

### 9. HTTP Caching Headers (ETag)
**Status:** Not implemented
**Complexity:** Medium | **Impact:** Medium

Add ETag and Last-Modified headers for client-side caching.

**Headers:**
```
ETag: "abc123"
Last-Modified: Mon, 13 Jan 2026 12:00:00 GMT
Cache-Control: private, max-age=60
```

**304 Not Modified** responses when content unchanged.

**Files to create:**
- `CachingMiddleware.java` - Calculate ETags, handle If-None-Match

---

### 10. Webhook Support
**Status:** Not implemented
**Complexity:** High | **Impact:** Medium

Push events to external HTTP endpoints.

**Configuration:**
```json
{
  "webhooks": [
    {
      "url": "https://discord.com/api/webhooks/...",
      "events": ["player.join", "player.leave"],
      "secret": "webhook-signing-secret",
      "retryPolicy": {
        "maxAttempts": 3,
        "backoffMs": 1000
      }
    }
  ]
}
```

**Files to create:**
- `WebhookConfig.java` - Configuration
- `WebhookDispatcher.java` - Send HTTP POST requests
- `WebhookRetry.java` - Exponential backoff retry

---

### 11. API Versioning
**Status:** Not implemented
**Complexity:** Medium | **Impact:** Medium

Support versioned API paths for backward compatibility.

**Paths:**
```
GET /api/v1/players
GET /api/v2/players  (enhanced response format)
```

**Files to modify:**
- `HttpRequestRouter.java` - Extract version from path
- Version-specific handlers if needed

---

## Additional Ideas

### 12. Audit Log Implementation
**Status:** Config exists, not implemented
**Complexity:** Medium | **Impact:** Medium

The `AuditConfig` exists but actual logging is not implemented.

**Features:**
- Log admin actions (kick, ban, command)
- Redact sensitive fields (password, token)
- Persistent log storage (file or database)

**Files to create:**
- `AuditLogger.java` - Central audit logging service

---

### 13. Server-Sent Events (SSE)
**Status:** Not implemented
**Complexity:** Medium | **Impact:** Low

Alternative to WebSocket for simpler event streaming.

**Endpoint:**
```
GET /events/stream?events=player.join,player.leave
Content-Type: text/event-stream

data: {"type":"player.join","uuid":"..."}
```

**Benefit:** Better compatibility with proxies and firewalls.

---

### 14. Batch Operations
**Status:** Not implemented
**Complexity:** High | **Impact:** Medium

Execute multiple API operations in a single request.

**Endpoint:**
```
POST /batch
{
  "requests": [
    {"method": "POST", "path": "/admin/kick", "body": {...}},
    {"method": "POST", "path": "/admin/kick", "body": {...}}
  ]
}
```

---

### 15. Request Signing (HMAC)
**Status:** Not implemented
**Complexity:** Medium | **Impact:** Medium

Verify request integrity with HMAC signatures.

**Header:**
```
X-Signature: alg=hmac-sha256,sig=...,ts=1705312200
```

---

### 16. API Key Rotation
**Status:** Not implemented
**Complexity:** Medium | **Impact:** Medium

Support gradual secret rollover without downtime.

**Configuration:**
```json
{
  "clients": [{
    "id": "monitor",
    "secret": "$2a$12$current-hash",
    "rotatedSecrets": ["$2a$12$old-hash"],
    "secretRotationDeadline": "2026-02-13T00:00:00Z"
  }]
}
```

---

### 17. Debug Mode
**Status:** Not implemented
**Complexity:** Low | **Impact:** Medium

Include stack traces in error responses when debug mode is enabled.

**Configuration:**
```json
{
  "debug": true
}
```

---

## SDK Features (Pending SDK Support)

These features depend on Hytale Server SDK capabilities:

### NPC System
- `GET /npcs` - List NPCs
- `GET /npcs/{uuid}` - NPC details
- `POST /npcs/{uuid}/interact` - Trigger interaction
- WebSocket: `npc.damage`, `npc.interact`

### Crafting System
- `GET /crafting/recipes` - List recipes
- `GET /players/{uuid}/recipes/learned` - Learned recipes
- `POST /players/{uuid}/craft` - Execute craft

### Quest/Objectives System
- `GET /objectives` - List quests
- `GET /players/{uuid}/objectives` - Player progress
- `POST /players/{uuid}/objectives/{id}/accept` - Accept quest

### Reputation System
- `GET /players/{uuid}/reputation` - Player reputation
- `POST /players/{uuid}/reputation/{npc}` - Modify reputation

### Entity Effects
- `GET /entities/{uuid}/effects` - Active effects
- `POST /entities/{uuid}/effects` - Apply effect
- `DELETE /entities/{uuid}/effects/{id}` - Remove effect

### Particles & Sounds
- `POST /particles/spawn` - Spawn particles
- `POST /sounds/play` - Play sound

---

## Priority Matrix

| Priority | Feature | Complexity | Impact |
|----------|---------|------------|--------|
| **P1** | GZIP Compression | Low | High |
| **P1** | IP Whitelist/Blacklist | Low | High |
| **P1** | Prometheus Metrics | Medium | High |
| **P1** | Pagination | Medium | High |
| **P2** | Per-Client Rate Limits | Medium | High |
| **P2** | Request ID Tracking | Low | Medium |
| **P2** | OpenAPI Documentation | Medium | High |
| **P2** | Filtering & Sorting | Medium | High |
| **P3** | HTTP Caching (ETag) | Medium | Medium |
| **P3** | Audit Log Implementation | Medium | Medium |
| **P3** | API Versioning | Medium | Medium |
| **P3** | Webhook Support | High | Medium |
| **P4** | Debug Mode | Low | Medium |
| **P4** | SSE Alternative | Medium | Low |
| **P4** | Batch Operations | High | Medium |
| **P4** | Request Signing | Medium | Medium |

---

## Contributing

When implementing a feature:
1. Create a branch: `feature/feature-name`
2. Follow existing code patterns (records, sealed classes, pattern matching)
3. Add configuration options to `ApiConfig.java` if needed
4. Update `README.md` and `CLAUDE.md` documentation
5. Test thoroughly before submitting PR
