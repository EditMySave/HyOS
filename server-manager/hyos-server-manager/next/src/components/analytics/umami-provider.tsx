"use client";

import Script from "next/script";
import { useCallback, useEffect, useState } from "react";
import { useConfig } from "@/lib/services/config";

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, unknown>) => void;
    };
  }
}

const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

export function UmamiProvider() {
  const { data: config } = useConfig();
  const [scriptLoaded, setScriptLoaded] = useState(false);

  const enabled = !!UMAMI_WEBSITE_ID && config?.telemetryEnabled !== false;

  const onScriptLoad = useCallback(() => setScriptLoaded(true), []);

  // Capture client-side errors
  useEffect(() => {
    if (!enabled || !scriptLoaded) return;

    function handleError(event: ErrorEvent) {
      window.umami?.track("client-error", {
        message: event.message?.substring(0, 500) ?? "Unknown error",
        stack: event.error?.stack?.substring(0, 500) ?? "",
        source: event.filename ?? "unknown",
      });
    }

    function handleRejection(event: PromiseRejectionEvent) {
      const reason = event.reason;
      const message = reason instanceof Error ? reason.message : String(reason);
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
  }, [enabled, scriptLoaded]);

  if (!enabled) return null;

  return (
    <Script
      src="/stats/script"
      data-website-id={UMAMI_WEBSITE_ID}
      data-host-url="/stats"
      data-auto-track="false"
      strategy="lazyOnload"
      onLoad={onScriptLoad}
    />
  );
}
