# TrueNAS implementation review
_Exported on 23/01/2026 at 17:14:39 GMT from Cursor (2.4.21)_

---

**User**

use context7 and tell me what we might be missing from our truenas implementation using the truenas docs

---

**Cursor**

Based on the TrueNAS documentation, here's what your implementation might be missing or could be improved:

## Missing/Recommended Additions

### 1. **Resource Limits (CPU/Memory)**
Your compose file doesn't specify resource limits. TrueNAS apps should define these:

```yaml
services:
  hytale:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '4.0'
          memory: 10G
        reservations:
          cpus: '2.0'
          memory: 4G
```

### 2. **GPU Configuration** (if applicable)
If the server could benefit from GPU acceleration, TrueNAS supports GPU passthrough:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: 1
          capabilities: [gpu]
```

### 3. **Stop Grace Period**
For a game server that needs to save state before shutdown:

```yaml
services:
  hytale:
    stop_grace_period: 60s
```

### 4. **ixVolume Storage Option**
TrueNAS recommends using `ixVolume` as an alternative to host paths for better management. Your current config only uses host paths. You could document the ixVolume approach:

```yaml
volumes:
  # Option 1: Host path (your current approach - good for existing datasets)
  - /mnt/tank/apps/hytale:/data:rw
  # Option 2: ixVolume (TrueNAS managed - creates dataset automatically)
  # - type: volume
  #   source: hytale-data
  #   target: /data
```

### 5. **Read-Only Root Filesystem** (security hardening)
Consider adding for better security:

```yaml
read_only: true
tmpfs:
  - /tmp
  - /run
```

### 6. **Labels for TrueNAS Discovery**
TrueNAS apps often include labels for UI integration:

```yaml
labels:
  - "truenas.app=hytale"
  - "truenas.widget.group=Games"
```

### 7. **Init Container for Permissions**
TrueNAS apps pattern uses a permissions init container:

```yaml
services:
  permissions:
    image: busybox
    command: ["sh", "-c", "chown -R 568:568 /data"]
    volumes:
      - /mnt/tank/apps/hytale:/data
    user: "0:0"
  
  hytale:
    depends_on:
      permissions:
        condition: service_completed_successfully
    # ... rest of config
```

### 8. **Capability Dropping**
Your `security_opt: no-new-privileges` is good. Consider also:

```yaml
cap_drop:
  - ALL
cap_add:
  - NET_BIND_SERVICE  # if needed for ports < 1024
```

## Summary of Priority Items

| Missing Item | Priority | Reason |
|-------------|----------|--------|
| Resource limits | High | Prevents container from consuming all system resources |
| Stop grace period | High | Clean server shutdown for game state |
| Cap drop | Medium | Security best practice |
| Read-only root | Low | Extra security hardening |
| ixVolume docs | Low | Alternative storage option |

Your implementation is solid overall - you have the user mapping (568:568), health checks, logging limits, and security opts. The main gap is resource limits which TrueNAS explicitly recommends configuring.

