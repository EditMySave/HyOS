"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { useConfig } from "@/lib/services/config";
import { useInstalledMods } from "@/lib/services/mods/mods.hooks";
import { useServerStatus } from "@/lib/services/server";

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, unknown>) => void;
    };
  }
}

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const UMAMI_HOST = process.env.NEXT_PUBLIC_UMAMI_HOST;
const HEARTBEAT_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

export function UmamiProvider() {
  const { data: config } = useConfig();
  const { data: serverStatus } = useServerStatus();
  const { data: mods } = useInstalledMods();
  const heartbeatSent = useRef(false);

  const enabled = !!UMAMI_WEBSITE_ID && !!UMAMI_HOST && config?.telemetryEnabled !== false;

  // Heartbeat: send on mount + every 24 hours
  useEffect(() => {
    if (!enabled || !window.umami) return;

    function sendHeartbeat() {
      window.umami?.track("heartbeat", {
        version: serverStatus?.version ?? "unknown",
        uptime: serverStatus?.uptime ?? 0,
        modsInstalled: mods?.count ?? 0,
      });
    }

    // Send initial heartbeat once script is loaded
    if (!heartbeatSent.current) {
      sendHeartbeat();
      heartbeatSent.current = true;
    }

    const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [enabled, serverStatus?.version, serverStatus?.uptime, mods?.count]);

  // Capture client-side errors
  useEffect(() => {
    if (!enabled) return;

    function handleError(event: ErrorEvent) {
      window.umami?.track("client-error", {
        message: event.message?.substring(0, 500) ?? "Unknown error",
        stack: event.error?.stack?.substring(0, 500) ?? "",
        source: event.filename ?? "unknown",
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message =
        reason instanceof Error ? reason.message : String(reason);
      const stack = reason instanceof Error ? reason.stack : undefined;

      window.umami?.track("client-error", {
        message: message?.substring(0, 500) ?? "Unhandled rejection",
        stack: stack?.substring(0, 500) ?? "",
        source: "unhandledrejection",
      });
    }

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleRejection);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <Script
      src={`${UMAMI_HOST}/script.js`}
      data-website-id={UMAMI_WEBSITE_ID}
      data-auto-track="false"
      strategy="lazyOnload"
    />
  );
}
