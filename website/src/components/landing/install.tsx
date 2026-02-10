"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const COMPOSE_YAML = `services:
  hytale:
    image: ghcr.io/editmysave/hyos/server:latest
    container_name: hytale-server
    restart: unless-stopped
    ports:
      - "5520:5520/udp"
    environment:
      JAVA_XMS: "4G"
      JAVA_XMX: "8G"
      PATCHLINE: "release"
    volumes:
      - hytale-data:/data
      - /etc/machine-id:/etc/machine-id:ro
    stdin_open: true
    tty: true

volumes:
  hytale-data:`;

const DOCKER_COMMANDS = `docker compose up -d
docker attach hytale-server  # complete auth flow
docker compose logs -f       # watch logs`;

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
  return (
    <section id="install" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          Install HyOS
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Save as <code className="text-foreground">docker-compose.yml</code>,
          then run the commands below.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <span className="text-sm font-medium text-foreground">
                docker-compose.yml
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
      </div>
    </section>
  );
}
