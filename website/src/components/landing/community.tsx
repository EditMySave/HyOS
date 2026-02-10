import { Github, Bug, BookOpen, Coffee } from "lucide-react";

const CARDS = [
  {
    icon: Github,
    title: "Source code",
    description: "Browse the full source on GitHub. MIT licensed.",
    href: "https://github.com/editmysave/hyOS",
  },
  {
    icon: Bug,
    title: "Issues",
    description: "Report bugs or request features on GitHub Issues.",
    href: "https://github.com/editmysave/hyOS/issues",
  },
  {
    icon: BookOpen,
    title: "Docs",
    description: "Comprehensive guides for setup, config, and deployment.",
    href: "/docs",
  },
  {
    icon: Coffee,
    title: "Support the project",
    description: "Buy me a coffee to support ongoing development.",
    href: "https://buymeacoffee.com/editmysave",
  },
];

export function Community() {
  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          Get involved
        </h2>
        <p className="mt-3 text-base text-muted-foreground">
          HyOS is open source. Contributions, issues, and feedback are welcome.
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {CARDS.map((card) => {
            const isExternal = card.href.startsWith("http");
            return (
              <a
                key={card.title}
                href={card.href}
                {...(isExternal
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className="group border border-border bg-card p-6 transition hover:border-muted-foreground"
              >
                <card.icon className="h-6 w-6 text-status-online" />
                <h3 className="mt-4 font-cablefied text-lg tracking-tight text-foreground">
                  {card.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {card.description}
                </p>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
