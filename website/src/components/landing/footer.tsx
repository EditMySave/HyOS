import Link from "next/link";

const LINKS = [
  { href: "/", label: "About" },
  { href: "#install", label: "Install" },
  { href: "/docs", label: "Docs" },
  {
    href: "https://github.com/editmysave/hyOS",
    label: "GitHub",
    external: true,
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <span className="font-cablefied text-xl tracking-tight text-foreground">
              HyOS
            </span>
            <p className="mt-1 text-sm text-muted-foreground">
              Open-source Hytale server management.
            </p>
          </div>
          <nav className="flex gap-6">
            {LINKS.map((link) => {
              const isExternal = "external" in link;
              return (
                <Link
                  key={link.label}
                  href={link.href}
                  {...(isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="text-sm text-muted-foreground transition hover:text-foreground"
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-8 border-t border-border pt-6">
          <p className="text-xs text-foreground-muted">
            &copy; {new Date().getFullYear()} HyOS. MIT License.
          </p>
        </div>
      </div>
    </footer>
  );
}
