"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/commands", label: "Commands" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="w-full border-b border-[#1f1f1f] bg-transparent">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex items-stretch justify-between">
          <Link
            href="/"
            className="py-6 pr-10 text-white text-2xl leading-none tracking-tight font-[var(--font-cablefied)]"
          >
            HyOS
          </Link>

          <nav className="hidden md:flex items-stretch border-x border-dashed border-[#1f1f1f]">
            {NAV_ITEMS.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    "px-10 py-6 text-sm font-medium tracking-tight",
                    "border-l border-dashed border-[#1f1f1f] first:border-l-0",
                    active
                      ? "text-white border-b-2 border-b-[#2d6cff]"
                      : "text-[#7a7a7a] hover:text-white",
                  ].join(" ")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="py-6 pl-10 text-sm text-[#7a7a7a] hidden md:block">
            {/* spacer to mimic Cablefied header layout */}
          </div>
        </div>
      </div>
    </header>
  );
}
