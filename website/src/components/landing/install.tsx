"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const COMPOSE_YAML = `services:
  hyos-server:
    image: ghcr.io/editmysave/hyos/server:latest
    pull_policy: always
    container_name: hyos-server
    user: "568:568"
    restart: unless-stopped
    stdin_open: true
    tty: true
    environment:
      PUID: 568
      PGID: 568
      JAVA_XMS: 4G
      JAVA_XMX: 8G
      SERVER_NAME: "My Hytale Server"
    ports:
      - "30520:5520/udp"
    volumes:
      - /opt/hytale:/data:rw
    healthcheck:
      test: ["CMD", "/opt/scripts/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s
    stop_grace_period: 30s`;

const DOCKER_COMMANDS = `docker compose up -d
docker attach hyos-server   # complete auth flow
docker compose logs -f       # watch logs`;

const TRUENAS_YAML = `x-api-config: &api-config
  # REQUIRED: Set your management API password (minimum 8 characters)
  API_CLIENT_SECRET: \${API_CLIENT_SECRET:-changeme123}
  API_CLIENT_ID: \${API_CLIENT_ID:-hyos-manager}

services:
  hyos-server:
    image: ghcr.io/editmysave/hyos/server:latest
    pull_policy: always
    container_name: hyos-server
    user: "568:568"
    restart: unless-stopped
    stdin_open: true
    tty: false

    environment:
      <<: *api-config
      PUID: 568
      PGID: 568
      UMASK: "002"
      TZ: \${TZ:-UTC}
      JAVA_XMS: \${JAVA_XMS:-8G}
      JAVA_XMX: \${JAVA_XMX:-12G}
      USE_ZGC: "false"
      G1_MAX_PAUSE: "200"
      SERVER_PORT: "5520"
      PATCHLINE: \${PATCHLINE:-release}
      ENABLE_AOT: "true"
      AUTO_UPDATE: \${AUTO_UPDATE:-false}
      VERSION_CHECK_ENABLED: \${VERSION_CHECK_ENABLED:-true}
      VERSION_CHECK_INTERVAL: \${VERSION_CHECK_INTERVAL:-3600}
      SKIP_CONFIG_GENERATION: "false"
      SERVER_NAME: \${SERVER_NAME:-Hytale Server}
      SERVER_MOTD: \${SERVER_MOTD:-}
      SERVER_PASSWORD: \${SERVER_PASSWORD:-}
      MAX_PLAYERS: \${MAX_PLAYERS:-100}
      MAX_VIEW_RADIUS: "32"
      DEFAULT_WORLD: \${DEFAULT_WORLD:-default}
      DEFAULT_GAMEMODE: \${DEFAULT_GAMEMODE:-Adventure}
      LOCAL_COMPRESSION: "false"
      DISPLAY_TMP_TAGS: "false"
      PLAYER_STORAGE_TYPE: "Hytale"
      WHITELIST_ENABLED: \${WHITELIST_ENABLED:-false}
      HYTALE_ACCEPT_EARLY_PLUGINS: "false"
      HYTALE_ALLOW_OP: "false"
      HYTALE_BACKUP: "true"
      HYTALE_BACKUP_FREQUENCY: "30"
      HYTALE_DISABLE_SENTRY: "false"
      API_ENABLED: "true"
      API_PORT: "8080"
      API_WEBSOCKET_ENABLED: "true"
      API_WEBSOCKET_STATUS_INTERVAL: "1"
      API_REGENERATE_CONFIG: "true"
      DEBUG: "false"
      NO_COLOR: "false"
    ports:
      # UDP port for Hytale QUIC protocol (game traffic)
      - "30520:5520/udp"
      - "30080:8080/tcp"
    volumes:
      # IMPORTANT: Update the host path to your TrueNAS dataset this holds your (world, config, mods, backups, auth)
      - /mnt/tank/apps/hytale:/data:rw

    healthcheck:
      test: ["CMD", "/opt/scripts/healthcheck.sh"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 15s

    # Graceful shutdown
    stop_grace_period: 30s

    # Logging - limit log size
    logging:
      driver: json-file
      options:
        max-size: "50m"
        max-file: "3"

    # Security
    security_opt:
      - no-new-privileges:true
  hyos-manager:
    image: ghcr.io/editmysave/hyos/manager:latest
    pull_policy: always
    container_name: hyos-manager

    # Run as TrueNAS apps user
    user: "568:568"
    # Add root group for Docker socket access (socket is 0:0 with 660 permissions)
    group_add:
      - "0"

    restart: unless-stopped

    environment:
      # Inherit shared API config (same password as server)
      <<: *api-config
      # Map to REST adapter env var names
      REST_API_CLIENT_SECRET: \${API_CLIENT_SECRET:-changeme123}
      REST_API_CLIENT_ID: \${API_CLIENT_ID:-hyos-manager}

      # Adapter configuration
      ADAPTER_TYPE: rest
      HYTALE_CONTAINER_NAME: hyos-server
      HYTALE_STATE_DIR: /data/.state
      HYTALE_SERVER_HOST: hyos-server
      HYTALE_SERVER_PORT: "8080"

      # Node environment
      NODE_ENV: production
      COOKIE_SECURE: "false"

    # Web UI port
    ports:
      - "30300:3000"

    # Volume mounts
    volumes:
      # Shared data directory (for state files and world management)
      - /mnt/tank/apps/hytale:/data:rw
      - /var/run/docker.sock:/var/run/docker.sock:ro
    depends_on:
      - hyos-server
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://127.0.0.1:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

    security_opt:
      - no-new-privileges:true

networks:
  default:
    driver: bridge
`;

const TRUENAS_STEPS = [
  "Create a dataset for server data in your TrueNAS UI",
  "Set dataset ACL permissions: User 568, Group 568",
  "Open the TrueNAS web UI and go to Apps",
  "Click Discover Apps (top-right)",
  "Click the 3 dots in the top right",
  "Select Install via YAML",
  "Paste the YAML below into the editor",
  "Update /mnt/tank/apps/hytale to your dataset path (both services)",
  "Replace changeme123 with a secure API password",
  "Adjust memory settings based on your system (minimum 8GB recommended)",
  "Click Save",
  "Game Server will be available on: UDP port 30520",
  "Management UI will be available on: http://your-truenas-ip:30300",
];

type Tab = "docker-compose" | "truenas";

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="absolute right-3 top-3 border border-border p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
}

export function Install() {
  const [activeTab, setActiveTab] = useState<Tab>("docker-compose");

  return (
    <section id="install" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          Install HyOS
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Choose your deployment method, then follow the steps below.
        </p>

        <div className="mt-6 flex gap-0 border-b border-border">
          <button
            type="button"
            onClick={() => setActiveTab("docker-compose")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              activeTab === "docker-compose"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Docker Compose
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("truenas")}
            className={`px-5 py-2.5 text-sm font-medium transition ${
              activeTab === "truenas"
                ? "border-b-2 border-foreground text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            TrueNAS Custom App
          </button>
        </div>

        {activeTab === "docker-compose" && (
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-foreground">
                  compose.yaml
                </span>
              </div>
              <div className="relative p-5">
                <pre className="overflow-x-auto text-sm leading-relaxed text-muted-foreground">
                  <code>{COMPOSE_YAML}</code>
                </pre>
                <CopyButton text={COMPOSE_YAML} />
              </div>
            </div>

            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-foreground">
                  Run
                </span>
              </div>
              <div className="relative p-5">
                <pre className="overflow-x-auto text-sm leading-relaxed text-muted-foreground">
                  <code>{DOCKER_COMMANDS}</code>
                </pre>
                <CopyButton text={DOCKER_COMMANDS} />
              </div>
              <div className="border-t border-border px-5 py-2">
                <span className="text-xs text-foreground-muted">
                  Requires Docker
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTab === "truenas" && (
          <div className="mt-10 grid gap-6 lg:grid-cols-[5fr_7fr]">
            <div className="border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-foreground">
                  Steps
                </span>
              </div>
              <div className="p-5">
                <ul className="list-disc space-y-2 pl-4 text-sm leading-relaxed text-muted-foreground">
                  {TRUENAS_STEPS.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="min-w-0 border border-border bg-card">
              <div className="border-b border-border px-5 py-3">
                <span className="text-sm font-medium text-foreground">
                  compose.yaml
                </span>
              </div>
              <div className="relative p-5">
                <pre className="max-h-[600px] overflow-auto text-sm leading-relaxed text-muted-foreground">
                  <code>{TRUENAS_YAML}</code>
                </pre>
                <CopyButton text={TRUENAS_YAML} />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
