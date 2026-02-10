"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

const LINUX_COMMAND = `curl -fsSL https://raw.githubusercontent.com/editmysave/hyOS/main/docker-compose.yml -o docker-compose.yml
docker compose up -d`;

const WINDOWS_COMMAND = `Invoke-WebRequest -Uri "https://raw.githubusercontent.com/editmysave/hyOS/main/docker-compose.yml" -OutFile "docker-compose.yml"
docker compose up -d`;

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
          One command to download and set up. Needs Docker.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <span className="text-sm font-medium text-foreground">
                Linux or macOS
              </span>
            </div>
            <div className="relative p-5">
              <pre className="overflow-x-auto text-sm leading-relaxed text-muted-foreground">
                <code>{LINUX_COMMAND}</code>
              </pre>
              <CopyButton text={LINUX_COMMAND} />
            </div>
            <div className="border-t border-border px-5 py-2">
              <span className="text-xs text-foreground-muted">
                Requires Docker
              </span>
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <span className="text-sm font-medium text-foreground">
                Windows PowerShell
              </span>
            </div>
            <div className="relative p-5">
              <pre className="overflow-x-auto text-sm leading-relaxed text-muted-foreground">
                <code>{WINDOWS_COMMAND}</code>
              </pre>
              <CopyButton text={WINDOWS_COMMAND} />
            </div>
            <div className="border-t border-border px-5 py-2">
              <span className="text-xs text-foreground-muted">
                Requires Docker Desktop
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
