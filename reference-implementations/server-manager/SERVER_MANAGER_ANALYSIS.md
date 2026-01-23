# Hytale Server Manager Analysis

Analysis of the `hytale_server_manager` project for building a similar tool integrated with TrueNAS.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Feature Inventory](#feature-inventory)
- [Key Implementation Patterns](#key-implementation-patterns)
- [Hytale Integration](#hytale-integration)
- [Identified Improvements](#identified-improvements)
- [Recommendations for TrueNAS Integration](#recommendations-for-truenas-integration)

---

## Architecture Overview

### Tech Stack

| Component | Technology |
|-----------|------------|
| **Backend** | Node.js + Express + TypeScript |
| **Frontend** | React + Vite + TypeScript + TailwindCSS |
| **Database** | SQLite via Prisma ORM |
| **Real-time** | Socket.io WebSockets |
| **Build System** | Turborepo monorepo + pnpm |
| **Scheduling** | node-cron |

### Project Structure

```
packages/
├── server/           # Express API + WebSocket server
│   ├── src/
│   │   ├── adapters/     # Server type abstraction (Java, Hytale)
│   │   ├── services/     # Business logic (29 services)
│   │   ├── routes/       # REST API endpoints (16 routes)
│   │   ├── websocket/    # Real-time events (4 event handlers)
│   │   ├── middleware/   # Auth, logging, permissions
│   │   └── providers/    # External service providers
│   └── prisma/           # Database schema + migrations
│
├── frontend/         # React SPA
│   └── src/
│       ├── pages/        # 20+ feature pages
│       ├── components/   # Reusable UI components
│       ├── hooks/        # Custom React hooks
│       ├── stores/       # Zustand state management
│       └── services/     # API client services
│
└── website/          # Astro documentation site
```

### Database Schema (Key Models)

```prisma
// Core entities
User            // Authentication, roles (admin/moderator/viewer)
Server          // Server instances with PID tracking, status
Player          // Connected players with stats
Backup          // Backup records with rotation support
ScheduledTask   // Cron-based automation
ConsoleLog      // Persisted server logs

// Metrics & Monitoring
ServerMetric    // Per-server CPU/memory/disk/players
HostMetric      // System-wide resource usage

// Mod Management
Mod             // Installed mods metadata
ModFile         // Individual files from mods

// Advanced Features
AutomationRule  // Event/condition-triggered actions
ServerNetwork   // Multi-server grouping
TaskGroup       // Sequential task execution
Alert           // Notification system
ActivityLog     // Audit trail
```

---

## Feature Inventory

### Server Management

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Start/Stop/Restart | `ServerService.ts` | Via adapter pattern |
| Kill (force) | `ServerService.ts` | SIGKILL fallback |
| Status tracking | Prisma + adapter | 6 states: stopped, starting, running, stopping, crashed, orphaned |
| Process persistence | PID stored in DB | Survives manager restarts |
| Orphan recovery | `recoverOrphanedServers()` | Reconnects to running processes |
| JVM configuration | Per-server `jvmArgs` | Memory, GC tuning |
| Multi-server support | Full | Each server has own config |

### Console & Logging

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Real-time logs | WebSocket `/console` | Socket.io rooms per server |
| Log streaming | `LogTailService.ts` | File tail with rotation |
| Log persistence | `ConsoleLog` model | 7-day retention by default |
| Command execution | `sendCommand()` | Via adapter (RCON or stdin) |
| Log filtering | Frontend | By level (info/warn/error) |

### Backup System

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Manual backups | `BackupService.ts` | Zip compression, level 9 |
| Scheduled backups | Cron integration | Via `ScheduledTask` |
| Backup rotation | Per-task limit | Auto-delete oldest |
| FTP storage | `FtpStorageService.ts` | Remote backup support |
| Exclusion patterns | `micromatch` globs | Skip logs, crash reports |
| Locked file handling | Retry with delay | Skips after N attempts |
| Restore | Extract + overwrite | Creates safety backup first |

### Metrics & Monitoring

| Feature | Implementation | Notes |
|---------|---------------|-------|
| CPU usage | Delta calculation | Per-server + host |
| Memory usage | `os.totalmem()/freemem()` | System-wide |
| Disk usage | Directory size | Per server path |
| Player count | From server | Via adapter |
| Collection interval | 60 seconds | Configurable |
| Retention | 30 days | Auto-cleanup |
| Historical charts | Aggregated buckets | 1h/24h/7d/30d views |

### Scheduling & Automation

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Cron scheduling | `node-cron` | UTC timezone |
| Task types | backup, restart, start, stop, command | Extensible |
| Task groups | Sequential execution | With delay between |
| Failure modes | Stop or continue | Configurable |
| Automation rules | Trigger + conditions + actions | Event-driven |
| Manual trigger | `runTaskNow()` | For testing |

### Hytale Downloader Integration

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Binary management | Auto-download from official URL | `hytale-downloader.zip` |
| OAuth device flow | Full implementation | Parse device code from CLI output |
| Token refresh | Auto-refresh timer | Configurable interval (default 30min) |
| Version caching | Zip files cached | Skip re-download |
| Download progress | Parsed from CLI stdout | Regex patterns |
| Server update | In-place with backup | Preserves config |

### User Management

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Authentication | JWT (access + refresh) | 15min / 7day expiry |
| Roles | admin, moderator, viewer | 3-tier |
| Permissions | Fine-grained per-action | 30+ permission codes |
| Account lockout | After N failed attempts | Temporary ban |
| Activity logging | Full audit trail | IP, user agent |

### Additional Features

| Feature | Implementation | Notes |
|---------|---------------|-------|
| Discord notifications | Webhook integration | Server events |
| Alerts | In-app notifications | Severity levels |
| File manager | Read/write/delete | Server directory access |
| Mod management | Modtale API | Download + install + track |
| Player management | Ban/kick/whitelist/OP | Via server commands |
| World management | List/switch worlds | Directory-based |
| Server networks | Logical grouping | Bulk actions |

---

## Key Implementation Patterns

### Adapter Pattern (Server Abstraction)

```typescript
// packages/server/src/adapters/IServerAdapter.ts
export interface IServerAdapter {
  // Lifecycle
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  kill(): Promise<void>;
  
  // Process persistence
  reconnect(pid: number): Promise<boolean>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  getPid(): number | null;
  
  // Monitoring
  getStatus(): Promise<ServerStatus>;
  getMetrics(): Promise<ServerMetrics>;
  
  // Console
  sendCommand(command: string): Promise<CommandResponse>;
  streamLogs(callback: (log: LogEntry) => void): void;
  stopLogStream(): void;
  
  // Players
  getPlayers(): Promise<Player[]>;
  kickPlayer(uuid: string, reason?: string): Promise<void>;
  banPlayer(uuid: string, reason?: string, duration?: number): Promise<void>;
  
  // Mods
  installMod(modFile: Buffer, metadata: ModMetadata): Promise<InstalledFile[]>;
  deleteModFiles(filePaths: string[]): Promise<void>;
  
  // Files
  readFile(relativePath: string): Promise<string>;
  writeFile(relativePath: string, content: string): Promise<void>;
}
```

**Issue**: Only `JavaServerAdapter` is implemented. `HytaleServerAdapter` throws "not yet implemented".

### WebSocket Authentication

```typescript
// packages/server/src/websocket/ConsoleEvents.ts
consoleNamespace.use(async (socket: AuthenticatedSocket, next) => {
  const token = socket.handshake.auth.token || 
                socket.handshake.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return next(new Error('Authentication required'));
  }
  
  const payload = jwt.verify(token, jwtSecret);
  
  if (payload.type !== 'access') {
    return next(new Error('Invalid token type'));
  }
  
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  socket.user = user;
  next();
});
```

### OAuth Device Code Parsing

```typescript
// packages/server/src/services/HytaleDownloaderService.ts
const parseDeviceCodeAndUrl = (source: string) => {
  // Extract URL with user_code parameter
  const urlMatch = source.match(/(https?:\/\/[^\s<>"]+)/i);
  const url = urlMatch?.[1] || null;
  
  // Extract code from URL query param
  let deviceCode: string | null = null;
  if (url) {
    const userCodeMatch = url.match(/[?&]user_code=([^&\s]+)/i);
    if (userCodeMatch) {
      deviceCode = userCodeMatch[1];
    }
  }
  
  return { url, deviceCode };
};
```

**Issue**: Fragile regex parsing of CLI output. Better to use official OAuth endpoints directly.

### Backup with Locked File Handling

```typescript
// packages/server/src/services/BackupService.ts
private async addFileToArchiveWithRetry(
  archive: archiver.Archiver,
  absolutePath: string,
  relativePath: string
): Promise<boolean> {
  const { retryAttempts, retryDelayMs } = config.backup;

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    try {
      const fileStat = await fs.stat(absolutePath);
      const fileBuffer = await fs.readFile(absolutePath);
      
      // Add buffer (not file path) to avoid stream errors
      archive.append(fileBuffer, {
        name: relativePath,
        date: fileStat.mtime,
        mode: fileStat.mode,
      });
      return true;
    } catch (error: any) {
      if (LOCKED_FILE_ERRORS.includes(error.code) && attempt < retryAttempts) {
        await this.sleep(retryDelayMs);
      } else {
        return false; // Skip file
      }
    }
  }
  return false;
}
```

---

## Hytale Integration

### Current Approach

The manager wraps the official `hytale-downloader` CLI binary:

1. **Download Binary**: Fetches from `https://downloader.hytale.com/hytale-downloader.zip`
2. **OAuth Flow**: Runs binary with `-print-version`, parses device code from stdout
3. **Token Storage**: Binary manages `.hytale-downloader-credentials.json`
4. **Downloads**: Runs binary with `-download-path` and `-patchline` args
5. **Version Check**: Parses version from `-print-version` output

### Server Interaction Points

| Operation | Method | Notes |
|-----------|--------|-------|
| Authentication | CLI wrapper | Device code flow |
| Download server files | CLI wrapper | Handles extraction |
| Check version | CLI wrapper | Parses stdout |
| Start server | Direct Java process | `java -jar HytaleServer.jar` |
| Send commands | RCON or stdin | RCON preferred |
| Read logs | File tail | `LogTailService` |

### Authentication Token Handling

```typescript
// Token expiry calculation
const REFRESH_TOKEN_TTL = 30 * 24 * 60 * 60; // 30 days

tokenInfo = {
  accessTokenExpiresAt,
  accessTokenExpiresIn,
  refreshTokenExpiresAt: authenticatedAt + REFRESH_TOKEN_TTL,
  refreshTokenExpiresIn,
  isAccessTokenExpired: accessTokenExpiresAt <= now,
  isRefreshTokenExpired: refreshTokenExpiresAt <= now,
  branch: credentials.branch,
};
```

---

## Identified Improvements

### Critical Issues

1. **No Native Hytale Adapter**
   - `HytaleServerAdapter` throws "not yet implemented"
   - Currently using generic `JavaServerAdapter`
   - Missing Hytale-specific features (universe, mods, whitelist)

2. **Fragile CLI Parsing**
   - OAuth device code extracted via regex
   - Version info parsed from stdout
   - Breaks when CLI output format changes

3. **SQLite Limitations**
   - Single-writer bottleneck
   - No clustering support
   - Limited to single-node deployment

4. **Memory-heavy Backup**
   - Reads entire files into memory before archiving
   - Can OOM on large servers

### Architecture Improvements

1. **Direct OAuth Integration**
   ```typescript
   // Instead of parsing CLI output, call OAuth endpoints directly
   const deviceResponse = await fetch(`${OAUTH_URL}/oauth2/device/auth`, {
     method: 'POST',
     body: new URLSearchParams({
       client_id: 'hytale-server',
       scope: 'openid offline auth:server',
     }),
   });
   ```

2. **Stream-based Backup**
   ```typescript
   // Use streams instead of buffers for large files
   archive.file(absolutePath, { name: relativePath });
   ```

3. **Process Manager**
   - Consider PM2 or systemd integration for production
   - Better process lifecycle management

4. **Config Hot-reload**
   - Watch config files for changes
   - Apply updates without restart

### Feature Gaps for TrueNAS

| Feature | Current | Needed for TrueNAS |
|---------|---------|-------------------|
| Container awareness | None | Docker socket integration |
| Volume management | Basic paths | ZFS dataset support |
| Permissions | JWT-based | TrueNAS middleware auth |
| Single YAML config | None | Required for Custom Apps |
| Healthcheck API | Internal only | Need HTTP endpoint |
| State files | SQLite | JSON files for Web UI |

---

## Recommendations for TrueNAS Integration

### 1. Simplified State Management

Instead of SQLite, use JSON state files that the TrueNAS Web UI can read:

```
/data/.state/
├── server.json      # Status, PID, uptime
├── version.json     # Current/latest version
├── auth.json        # Auth status (no secrets)
├── config.json      # Sanitized config
└── health.json      # Health check results
```

This approach is already implemented in our `config-truenas/scripts/lib/state.sh`.

### 2. Command Script Architecture

Expose functionality as standalone scripts that can be called from the Web UI:

```
/opt/scripts/cmd/
├── status.sh [--json]       # Get server status
├── update.sh [--check|--force]
├── backup.sh [--name NAME]
└── auth-init.sh             # Re-authenticate
```

### 3. Authentication Flow

Our implementation already handles this better:

```bash
# Direct OAuth endpoints (from config-truenas/scripts/lib/auth.sh)
device_response=$(curl -s -X POST "${OAUTH_URL}/oauth2/device/auth" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "client_id=${CLIENT_ID}" \
    -d "scope=${SCOPE}")
```

### 4. Features to Implement for Web UI

| Priority | Feature | Implementation |
|----------|---------|---------------|
| **P0** | Status display | Read `/data/.state/server.json` |
| **P0** | Start/Stop/Restart | Call container restart |
| **P0** | Logs viewer | Read container logs |
| **P1** | Config editor | Generate/validate config.json |
| **P1** | Backup management | List/create/restore |
| **P1** | Update mechanism | Version check + download |
| **P2** | Mod management | Modtale API integration |
| **P2** | Player management | Parse server logs or use API |
| **P3** | Scheduling | Cron-based tasks |
| **P3** | Metrics charts | Prometheus/InfluxDB |

### 5. Technology Choices for TrueNAS App

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **Backend** | Go or Rust | Single binary, low memory |
| **Frontend** | React + Vite | Reuse existing components |
| **State** | JSON files | Easy to read from shell scripts |
| **IPC** | Unix socket | For container communication |
| **Config** | Environment vars | TrueNAS Custom App pattern |

### 6. Reusable Components from hytale_server_manager

**Worth adapting:**
- Frontend pages/components structure
- Zustand stores pattern
- WebSocket event handlers
- Backup rotation logic

**Skip/rewrite:**
- SQLite/Prisma (use JSON files)
- Adapter pattern (too complex for single-server)
- node-cron (use container restart policies)

---

## Summary

The `hytale_server_manager` is a comprehensive server management tool with good feature coverage. However, for TrueNAS integration, a lighter-weight approach using:

1. **Shell scripts** for core operations (already done in `config-truenas/scripts/`)
2. **JSON state files** for Web UI communication (already done)
3. **Direct OAuth** instead of CLI wrapping (already done)
4. **Container-native** patterns instead of process management

This aligns better with TrueNAS's Custom App architecture and avoids the complexity of running a full Node.js backend inside the container.
