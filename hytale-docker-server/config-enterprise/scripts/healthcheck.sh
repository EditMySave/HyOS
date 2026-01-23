#!/bin/bash
# =============================================================================
# Health Check Script
# =============================================================================
# Comprehensive health check for enterprise deployments
# =============================================================================

set -e

SERVER_PORT="${SERVER_PORT:-5520}"
DATA_DIR="${DATA_DIR:-/data}"

# Check 1: Process running
if ! pgrep -f "HytaleServer.jar" > /dev/null 2>&1; then
    echo "UNHEALTHY: Server process not running"
    exit 1
fi

# Check 2: Port binding (if ss available)
if command -v ss > /dev/null 2>&1; then
    if ! ss -ulpn | grep -q ":${SERVER_PORT}" 2>/dev/null; then
        echo "UNHEALTHY: Port ${SERVER_PORT} not bound"
        exit 1
    fi
fi

# Check 3: Log activity (optional, within last 10 minutes)
if [ -d "${DATA_DIR}/logs" ]; then
    recent_log=$(find "${DATA_DIR}/logs" -name "*.log" -mmin -10 2>/dev/null | head -1)
    if [ -z "$recent_log" ]; then
        # No recent log activity - might be idle, not necessarily unhealthy
        echo "WARNING: No recent log activity"
    fi
fi

echo "HEALTHY"
exit 0
