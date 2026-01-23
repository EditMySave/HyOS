# syntax=docker/dockerfile:1.7

# =============================================================================
# Hytale Server - TrueNAS SCALE Configuration (Enterprise Features)
# =============================================================================
# Optimized for TrueNAS SCALE Custom Apps with:
# - Modular script architecture for Web UI integration
# - All 40+ server CLI options via environment variables
# - Flexible UID/GID support for TrueNAS datasets
# - Comprehensive state management
# =============================================================================

# --- STAGE 1: Builder ---
FROM eclipse-temurin:25-jre-alpine AS builder

RUN apk add --no-cache curl unzip dos2unix

WORKDIR /build

# Download and extract Hytale Downloader CLI
RUN curl -fsSL -o hytale-downloader.zip https://downloader.hytale.com/hytale-downloader.zip && \
    unzip -q hytale-downloader.zip && \
    mv hytale-downloader-linux-amd64 hytale-downloader && \
    chmod +x hytale-downloader && \
    rm -f hytale-downloader.zip hytale-downloader-windows-amd64.exe QUICKSTART.md 2>/dev/null || true

# Copy and prepare all scripts
COPY scripts/ ./scripts/
RUN find scripts -type f -name "*.sh" -exec dos2unix {} \; && \
    find scripts -type f -name "*.sh" -exec chmod +x {} \;

# --- STAGE 2: Final Runtime ---
FROM eclipse-temurin:25-jre-alpine

# OCI Labels
LABEL org.opencontainers.image.title="Hytale Server (TrueNAS Enterprise)" \
      org.opencontainers.image.description="Enterprise Hytale server for TrueNAS SCALE with Web UI support" \
      org.opencontainers.image.authors="hyOS Project"

# Default UID/GID - TrueNAS typically uses 568 for apps
ARG PUID=568
ARG PGID=568

# Core environment
ENV PUID=${PUID} \
    PGID=${PGID} \
    HOME=/home/hytale \
    DATA_DIR=/data \
    SCRIPTS_DIR=/opt/scripts \
    UMASK=002

# Server defaults
ENV SERVER_PORT=5520 \
    JAVA_XMS=4G \
    JAVA_XMX=8G \
    ENABLE_AOT=true \
    DISABLE_SENTRY=false \
    PATCHLINE=release

# GC defaults
ENV USE_ZGC=false \
    G1_MAX_PAUSE=200

# Config generation defaults
ENV SKIP_CONFIG_GENERATION=false \
    SERVER_NAME="Hytale Server" \
    MAX_PLAYERS=100 \
    MAX_VIEW_RADIUS=32 \
    DEFAULT_WORLD=default \
    DEFAULT_GAMEMODE=Adventure

# API Plugin environment variables
ENV API_ENABLED=true \
    API_PORT=8080 \
    API_CLIENT_ID=hyos-manager \
    API_CLIENT_SECRET="" \
    API_WEBSOCKET_ENABLED=true

# Install runtime dependencies
RUN apk add --no-cache \
    # Init system
    tini \
    # Privilege dropping
    su-exec \
    # glibc compatibility
    gcompat \
    libc6-compat \
    libstdc++ \
    # Utilities
    curl \
    jq \
    unzip \
    bash \
    coreutils \
    # User management
    shadow \
    # Network utilities (for healthcheck)
    iproute2 \
    # htpasswd for bcrypt password hashing (smaller than Python)
    apache2-utils

# Create app user with configurable UID/GID
RUN addgroup -g ${PGID} hytale && \
    adduser -D -h /home/hytale -u ${PUID} -G hytale -s /bin/bash hytale

# Create directories
RUN mkdir -p /data /opt/scripts && \
    chown -R hytale:hytale /data

# Copy artifacts from builder
COPY --from=builder --chown=root:root /build/hytale-downloader /usr/local/bin/hytale-downloader
COPY --from=builder --chown=root:root /build/scripts/ /opt/scripts/

# Copy plugins (pre-built JARs) if available
COPY --chown=root:root plugins/ /opt/plugins/

# Ensure all scripts are executable
RUN chmod -R +x /opt/scripts/

# Set working directory
WORKDIR /data

# Expose UDP port (QUIC protocol) and API port (HTTP)
EXPOSE ${SERVER_PORT}/udp
EXPOSE ${API_PORT}/tcp

# Health check using new modular script
HEALTHCHECK --interval=30s --timeout=10s --start-period=180s --retries=3 \
    CMD /opt/scripts/healthcheck.sh || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/bin/bash", "/opt/scripts/entrypoint.sh"]
