"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/services/auth";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard" },
  { href: "/commands", label: "Commands" },
  { href: "/permissions", label: "Permissions" },
  { href: "/mods", label: "Mods" },
  { href: "/logs", label: "Logs" },
  { href: "/worlds", label: "Worlds" },
];

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <header className="w-full border-b border-border bg-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-stretch justify-between">
          <Link
            href="/"
            className="py-6 pr-10 text-2xl leading-none tracking-tight text-foreground font-cablefied"
          >
            HyOS
          </Link>

          <nav className="hidden md:flex items-stretch border-x border-dashed border-border">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "px-10 py-6 text-sm font-medium tracking-tight",
                    "border-l border-dashed border-border first:border-l-0",
                    active
                      ? "text-foreground border-b-2 border-b-[#2d6cff]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="py-6 pl-10 flex items-center gap-3 hidden md:flex">
            <span className="text-sm text-muted-foreground">
              v{process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
