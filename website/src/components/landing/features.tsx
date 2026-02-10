import {
  Server,
  Puzzle,
  Terminal,
  Globe,
  Network,
  Activity,
} from "lucide-react";

const FEATURES = [
  {
    icon: Server,
    title: "Easy server setup",
    description:
      "Single Docker Compose file to deploy a fully configured Hytale dedicated server with automatic authentication.",
  },
  {
    icon: Puzzle,
    title: "Mod management",
    description:
      "Install mods from CurseForge, NexusMods, or ModTale. Upload custom JARs with automatic manifest validation.",
  },
  {
    icon: Terminal,
    title: "Live console",
    description:
      "Stream server logs in real-time and execute commands directly from the web dashboard.",
  },
  {
    icon: Globe,
    title: "World management",
    description:
      "Upload worlds, browse the file system, and switch between world slots through an intuitive UI.",
  },
  {
    icon: Network,
    title: "Docker networking",
    description:
      "Isolated container networking with configurable port mapping and bridge network support.",
  },
  {
    icon: Activity,
    title: "Server monitoring",
    description:
      "Health checks, resource usage tracking, and automated restart policies to keep your server running.",
  },
];

export function Features() {
  return (
    <section id="features" className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          What you can do with it
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          Everything you need to run and manage a Hytale dedicated server.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="border border-border bg-card p-6"
            >
              <feature.icon className="h-6 w-6 text-status-online" />
              <h3 className="mt-4 font-cablefied text-lg tracking-tight text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
