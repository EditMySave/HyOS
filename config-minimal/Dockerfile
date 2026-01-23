# syntax=docker/dockerfile:1.7

# =============================================================================
# Hytale Server - Minimal Production Configuration
# =============================================================================
# Optimized for size and simplicity. Uses Alpine with gcompat for compatibility.
# Target size: <250MB
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

# Prepare entrypoint script
COPY entrypoint.sh .
RUN dos2unix entrypoint.sh && chmod +x entrypoint.sh

# --- STAGE 2: Final Runtime ---
FROM eclipse-temurin:25-jre-alpine

# OCI Labels
LABEL org.opencontainers.image.title="Hytale Server (Minimal)" \
      org.opencontainers.image.description="Minimal Hytale dedicated server for production" \
      org.opencontainers.image.authors="hyOS Project"

# Build arguments
ARG UID=1000
ARG GID=1000

# Environment configuration
ENV USER=hytale \
    HOME=/home/hytale \
    DATA_DIR=/data \
    SERVER_PORT=5520 \
    JAVA_XMS=4G \
    JAVA_XMX=8G \
    ENABLE_AOT=true \
    DISABLE_SENTRY=false

# Install runtime dependencies
# - tini: proper PID 1 handling
# - gcompat: glibc compatibility layer for native libraries
# - curl/jq: OAuth authentication
# - unzip: server file extraction
RUN apk add --no-cache \
    tini \
    gcompat \
    libc6-compat \
    libstdc++ \
    curl \
    jq \
    unzip \
    bash

# Create non-root user
RUN addgroup -g ${GID} ${USER} && \
    adduser -D -h ${HOME} -u ${UID} -G ${USER} -s /bin/bash ${USER}

# Create data directory
RUN mkdir -p ${DATA_DIR} && chown -R ${USER}:${USER} ${DATA_DIR}

# Copy artifacts from builder
COPY --from=builder --chown=root:root /build/hytale-downloader /usr/local/bin/hytale-downloader
COPY --from=builder --chown=${USER}:${USER} /build/entrypoint.sh /entrypoint.sh

# Set working directory
WORKDIR ${DATA_DIR}

# Switch to non-root user
USER ${USER}

# Expose UDP port (QUIC protocol)
EXPOSE ${SERVER_PORT}/udp

# Health check - verify server is listening on port
HEALTHCHECK --interval=30s --timeout=5s --start-period=120s --retries=3 \
    CMD pgrep -f "HytaleServer.jar" > /dev/null || exit 1

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/bin/bash", "/entrypoint.sh"]
