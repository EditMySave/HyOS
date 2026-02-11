# syntax=docker/dockerfile:1.7

# =============================================================================
# Hytale Server - Developer Experience Configuration
# =============================================================================
# Full-featured development environment with TypeScript/Bun runtime,
# CurseForge mod support, verbose logging, and debugging capabilities.
# =============================================================================

# --- STAGE 1: TypeScript Builder ---
FROM oven/bun:1-alpine AS ts-builder

WORKDIR /build

# Copy TypeScript source
COPY src/ ./src/
COPY package.json tsconfig.json ./

# Install dependencies and build
RUN bun install --frozen-lockfile && \
    bun build ./src/main.ts --outdir ./dist --target bun

# --- STAGE 2: CLI Downloader ---
FROM alpine:3.21 AS cli-builder

RUN apk add --no-cache curl unzip

WORKDIR /build

# Download Hytale Downloader CLI
RUN curl -fsSL -o hytale-downloader.zip https://downloader.hytale.com/hytale-downloader.zip && \
    unzip -q hytale-downloader.zip && \
    mv hytale-downloader-linux-amd64 hytale-downloader && \
    chmod +x hytale-downloader && \
    rm -f hytale-downloader.zip hytale-downloader-windows-amd64.exe QUICKSTART.md 2>/dev/null || true

# --- STAGE 3: Final Runtime ---
FROM oven/bun:1-debian

# OCI Labels
LABEL org.opencontainers.image.title="Hytale Server (Developer)" \
      org.opencontainers.image.description="Developer-focused Hytale server with mod support" \
      org.opencontainers.image.authors="HyOS Project"

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
    DISABLE_SENTRY=true \
    LOG_LEVEL=DEBUG \
    MOD_INSTALL_MODE=off

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Java runtime
    openjdk-21-jre-headless \
    # Utilities
    curl \
    jq \
    unzip \
    # Process management
    tini \
    # Network tools (debugging)
    iproute2 \
    netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

# Install Java 25 (Temurin)
RUN curl -fsSL https://github.com/adoptium/temurin25-binaries/releases/download/jdk-25%2B8/OpenJDK25U-jre_x64_linux_hotspot_25_8.tar.gz \
    -o /tmp/java.tar.gz && \
    mkdir -p /opt/java && \
    tar -xzf /tmp/java.tar.gz -C /opt/java --strip-components=1 && \
    rm /tmp/java.tar.gz && \
    ln -sf /opt/java/bin/java /usr/local/bin/java

# Create non-root user
RUN groupadd -g ${GID} ${USER} && \
    useradd -m -d ${HOME} -u ${UID} -g ${USER} -s /bin/bash ${USER}

# Create directories
RUN mkdir -p ${DATA_DIR} ${HOME}/.cache && \
    chown -R ${USER}:${USER} ${DATA_DIR} ${HOME}

# Copy artifacts
COPY --from=cli-builder --chown=root:root /build/hytale-downloader /usr/local/bin/hytale-downloader
COPY --from=ts-builder --chown=${USER}:${USER} /build/dist/ /app/
COPY --from=ts-builder /build/node_modules/ /app/node_modules/

# Set working directory
WORKDIR ${DATA_DIR}

# Switch to non-root user
USER ${USER}

# Expose ports
EXPOSE ${SERVER_PORT}/udp

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=180s --retries=3 \
    CMD pgrep -f "HytaleServer.jar" > /dev/null || exit 1

# Use tini as init
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["bun", "run", "/app/main.js"]
