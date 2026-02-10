"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/#install", label: "Install" },
  { href: "/#features", label: "Features" },
  { href: "/docs", label: "Docs" },
  { href: "https://github.com/editmysave/hyOS", label: "GitHub", external: true },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-stretch justify-between">
          <Link
            href="/"
            className="flex items-center py-5 pr-10"
          >
            <span className="font-cablefied text-2xl leading-none tracking-tight text-foreground">
              HyOS
            </span>
          </Link>

          <nav className="hidden items-stretch border-x border-dashed border-border md:flex">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              const isExternal = "external" in item;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  {...(isExternal
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className={cn(
                    "flex items-center border-l border-dashed border-border px-8 text-sm font-medium tracking-tight first:border-l-0",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="hidden py-5 pl-10 md:block" />
        </div>
      </div>
    </header>
  );
}
