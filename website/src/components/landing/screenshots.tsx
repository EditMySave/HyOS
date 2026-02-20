"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDES = [
  {
    src: "/screenshots/screenshot-1.png",
    title: "Server Dashboard",
    bullets: [
      "Real-time server stats and performance graphs",
      "Quick actions: start, stop, restart, backup",
      "Player count, memory usage, and uptime tracking",
    ],
  },
  {
    src: "/screenshots/screenshot-2.png",
    title: "Command Console",
    bullets: [
      "Execute raw commands directly from the UI",
      "Admin, player, and world command panels",
      "Teleport, kick, ban, and whitelist controls",
    ],
  },
  {
    src: "/screenshots/screenshot-3.png",
    title: "Mod Management",
    bullets: [
      "Search CurseForge, Modtale, and NexusMods",
      "Upload custom mod JARs with validation",
      "Track installed mods and manage updates",
    ],
  },
  {
    src: "/screenshots/screenshot-4.png",
    title: "Permissions System",
    bullets: [
      "Manage operators with live server sync",
      "Create and edit permission groups",
      "Assign users to groups with fine-grained control",
    ],
  },
  {
    src: "/screenshots/screenshot-5.png",
    title: "Log Viewer",
    bullets: [
      "Live log streaming with pause and reload",
      "Filter by level, time range, and search",
      "Color-coded INFO, WARN, and ERROR entries",
    ],
  },
  {
    src: "/screenshots/screenshot-6.png",
    title: "World Management",
    bullets: [
      "Upload world zip files to named slots",
      "Browse current universe folder structure",
      "Switch between world slots with one click",
    ],
  },
];

export function Screenshots() {
  const [current, setCurrent] = useState(0);
  const slide = SLIDES[current];

  const prev = () => setCurrent((c) => (c === 0 ? SLIDES.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === SLIDES.length - 1 ? 0 : c + 1));

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <p className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Screenshots
        </p>
        <h2 className="font-cablefied text-4xl tracking-tight text-foreground">
          What it looks like
        </h2>

        <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="relative border border-border bg-card">
            <Image
              src={slide.src}
              alt={slide.title}
              width={1200}
              height={700}
              className="h-auto w-full"
            />
            <div className="absolute bottom-4 left-4 flex gap-2">
              <button
                type="button"
                onClick={prev}
                className="border border-border bg-background/80 p-2 backdrop-blur transition hover:bg-secondary"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={next}
                className="border border-border bg-background/80 p-2 backdrop-blur transition hover:bg-secondary"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="absolute bottom-4 right-4 border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              {current + 1} / {SLIDES.length}
            </div>
          </div>

          <div className="border border-border bg-card">
            <div className="border-b border-border px-5 py-3">
              <span className="text-xs font-medium uppercase tracking-[0.15em] text-muted-foreground">
                HyOS UI
              </span>
            </div>
            <div className="p-5">
              <h3 className="font-cablefied text-xl tracking-tight text-foreground">
                {slide.title}
              </h3>
              <ul className="mt-4 space-y-2">
                {slide.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-status-online" />
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex gap-3 border-t border-border p-5">
              <Link
                href="/docs"
                className="border border-border px-4 py-2 text-xs font-medium text-foreground transition hover:bg-secondary"
              >
                Read docs
              </Link>
              <Link
                href="#install"
                className="border border-status-online px-4 py-2 text-xs font-medium text-status-online transition hover:bg-status-online/10"
              >
                Start install
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-center gap-1.5">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={`h-1.5 w-1.5 transition ${
                i === current ? "bg-foreground" : "bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
