import Link from "next/link";
import Image from "next/image";

const GLANCE_ROWS = [
  { label: "Setup", value: "Docker compose" },
  { label: "Auth", value: "OAuth device flow" },
  { label: "Mods", value: "Install + patch" },
  { label: "Dashboard", value: "Web UI included" },
  { label: "API", value: "REST endpoints" },
];

export function Hero() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-24 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col justify-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Hytale Server Management
          </p>
          <h1 className="font-cablefied text-5xl leading-[1.1] tracking-tight text-foreground lg:text-6xl">
            About HyOS
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground">
            A Docker-based Hytale dedicated server management ecosystem. One
            command to deploy, authenticate, and manage your server with a
            full web dashboard, mod support, and automated updates.
          </p>
          <div className="mt-8 flex gap-4">
            <Link
              href="#install"
              className="border border-status-online px-6 py-3 text-sm font-medium text-status-online transition hover:bg-status-online/10"
            >
              Install in minutes
            </Link>
            <Link
              href="/docs"
              className="border border-border px-6 py-3 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              Read docs
            </Link>
          </div>
        </div>

        <div className="flex items-center">
          <div className="w-full border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <span className="text-sm font-medium text-foreground">
                HyOS at a glance
              </span>
              <span className="border border-status-online/30 bg-status-online/10 px-2 py-0.5 text-xs font-medium text-status-online">
                Live
              </span>
            </div>
            <div className="divide-y divide-border">
              {GLANCE_ROWS.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <span className="text-sm text-muted-foreground">
                    {row.label}
                  </span>
                  <span className="text-sm text-foreground">{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
