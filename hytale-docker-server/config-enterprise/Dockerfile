# syntax=docker/dockerfile:1.7

# =============================================================================
# Hytale Server - Enterprise/Hosting Configuration
# =============================================================================
# Full-featured production image for hosting providers with:
# - All 40+ server CLI options exposed as environment variables
# - Token injection support for headless deployment
# - Comprehensive health checks
# - Full glibc compatibility (Ubuntu base)
# =============================================================================

# --- STAGE 1: Builder ---
FROM eclipse-temurin:25-jre AS builder

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    unzip \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Download Hytale Downloader CLI
RUN curl -fsSL -o hytale-downloader.zip https://downloader.hytale.com/hytale-downloader.zip && \
    unzip -q hytale-downloader.zip && \
    mv hytale-downloader-linux-amd64 hytale-downloader && \
    chmod +x hytale-downloader && \
    rm -f hytale-downloader.zip hytale-downloader-windows-amd64.exe QUICKSTART.md 2>/dev/null || true

# Prepare scripts
COPY scripts/ ./scripts/
RUN find scripts -type f -name "*.sh" -exec dos2unix {} \; && \
    chmod -R +x scripts

# --- STAGE 2: Final Runtime ---
FROM eclipse-temurin:25-jre

# OCI Labels
LABEL org.opencontainers.image.title="Hytale Server (Enterprise)" \
      org.opencontainers.image.description="Enterprise Hytale server for hosting providers" \
      org.opencontainers.image.authors="hyOS Project"

# Build arguments
ARG UID=1000
ARG GID=1000
ARG BUILDTIME=local
ARG VERSION=local
ARG REVISION=local

# Core environment
ENV USER=hytale \
    HOME=/home/hytale \
    DATA_DIR=/data \
    SCRIPTS_DIR=/opt/scripts

# Server environment defaults
ENV SERVER_PORT=5520 \
    JAVA_XMS=4G \
    JAVA_XMX=8G \
    ENABLE_AOT=true \
    USE_G1GC=true \
    PATCHLINE=release

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Process management
    tini \
    gosu \
    # Network utilities
    curl \
    iproute2 \
    netcat-openbsd \
    # JSON processing
    jq \
    # File handling
    unzip \
    # Timezone
    tzdata \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user with configurable UID/GID
RUN groupadd -g ${GID} ${USER} && \
    useradd -m -d ${HOME} -u ${UID} -g ${USER} -s /bin/bash ${USER}

# Create directories
RUN mkdir -p ${DATA_DIR} ${SCRIPTS_DIR} && \
    chown -R ${USER}:${USER} ${DATA_DIR}

# Copy artifacts
COPY --from=builder --chown=root:root /build/hytale-downloader /usr/local/bin/hytale-downloader
COPY --from=builder --chown=root:root /build/scripts/ ${SCRIPTS_DIR}/

# Build metadata
RUN printf "buildtime=${BUILDTIME}\nversion=${VERSION}\nrevision=${REVISION}\n" > /etc/image.properties

# Set working directory
WORKDIR ${DATA_DIR}

# Expose UDP port
EXPOSE ${SERVER_PORT}/udp

# Stop signal
STOPSIGNAL SIGTERM

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD ${SCRIPTS_DIR}/healthcheck.sh

# Use tini as init, gosu for user switching
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/opt/scripts/entrypoint.sh"]
