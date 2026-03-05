import { promises as fs } from "node:fs";
import path from "node:path";
import umami from "@umami/node";
import { checkHealth, apiRequest } from "@/lib/hytale-api";
import { ensureInit, isEnabled } from "./umami.server";

const HEARTBEAT_INTERVAL = 60 * 60 * 1000; // 1 hour
const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    return path.join(path.dirname(stateDir), "mods");
  }
  return "/tmp/hytale-data/mods";
}

async function countMods(): Promise<number> {
  try {
    const modsPath = getModsPath();
    const entries = await fs.readdir(modsPath);
    return entries.filter((name) => name.endsWith(".jar")).length;
  } catch {
    return 0;
  }
}

async function sendHeartbeat(): Promise<void> {
  try {
    const appVersion = APP_VERSION;
    let version = "unknown";
    let uptime = 0;

    try {
      const healthy = await checkHealth();
      if (healthy) {
        const status = await apiRequest<{ version?: string; uptime?: number }>(
          "/server/status",
        );
        version = status.version ?? "unknown";
        uptime = status.uptime ?? 0;
      }
    } catch {
      // Server offline — use defaults
    }

    const modsInstalled = await countMods();

    await umami.track({
      url: "/heartbeat",
      name: "heartbeat",
      data: {
        appVersion,
        version,
        uptime,
        modsInstalled,
      },
    });

    console.log("[heartbeat] Sent successfully");
  } catch (error) {
    console.error("[heartbeat] Failed to send:", error);
  }
}

export function startHeartbeat(): void {
  isEnabled().then((enabled) => {
    if (!enabled) {
      console.log("[heartbeat] Analytics disabled, skipping");
      return;
    }

    ensureInit();

    // Send immediately, then every hour
    sendHeartbeat();
    setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    console.log("[heartbeat] Started (interval: 1h)");
  });
}
