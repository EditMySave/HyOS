import type { NextRequest } from "next/server";
import { loadConfig } from "@/lib/services/config/config.loader";

const UMAMI_HOST = process.env.UMAMI_HOST;

let enabledCache: boolean | null = null;

async function isTelemetryEnabled(): Promise<boolean> {
  if (enabledCache !== null) return enabledCache;

  try {
    const config = await loadConfig();
    enabledCache = config.telemetryEnabled;
    setTimeout(
      () => {
        enabledCache = null;
      },
      5 * 60 * 1000,
    );
    return enabledCache;
  } catch {
    return true;
  }
}

export async function POST(request: NextRequest) {
  if (!UMAMI_HOST) {
    return new Response(null, { status: 503 });
  }

  if (!(await isTelemetryEnabled())) {
    return new Response(null, { status: 403 });
  }

  try {
    const body = await request.text();

    await fetch(`${UMAMI_HOST}/api/send`, {
      method: "POST",
      headers: {
        "Content-Type":
          request.headers.get("Content-Type") ?? "application/json",
        "User-Agent": request.headers.get("User-Agent") ?? "",
      },
      body,
    });

    return new Response(null, { status: 200 });
  } catch {
    return new Response(null, { status: 200 });
  }
}
