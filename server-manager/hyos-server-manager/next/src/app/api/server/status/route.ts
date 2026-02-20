import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getContainerState, isDockerAvailable } from "@/lib/docker";
import { apiRequest, checkHealth, clearCache } from "@/lib/hytale-api";
import { loadConfig } from "@/lib/services/config/config.loader";

interface ApiStatusResponse {
  name: string;
  motd: string;
  playerCount: number;
  maxPlayers: number;
  uptime: number;
  memory: {
    used: number;
    max: number;
    free: number;
  };
  online: boolean;
}

// Response for when server is stopped/unreachable
function stoppedResponse(
  state: "stopped" | "starting" | "running" | "crashed" = "stopped",
) {
  return {
    online: false,
    name: "",
    motd: "",
    version: "",
    playerCount: 0,
    maxPlayers: 0,
    uptime: null,
    memory: null,
    state: state === "running" ? "starting" : state,
  };
}

/**
 * Read server state from state file
 */
async function readStateFile(): Promise<{ status: string } | null> {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const serverStatePath = path.join(stateDir, "server.json");

    const content = await fs.readFile(serverStatePath, "utf-8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Determine server state by checking state file, then Docker container when API is unavailable.
 * Falls back to "stopped" if neither is available.
 */
async function getOfflineState(): Promise<
  "stopped" | "starting" | "running" | "crashed"
> {
  // First try reading from state file
  const stateFile = await readStateFile();
  if (stateFile) {
    const status = stateFile.status?.toLowerCase();
    if (status === "running") {
      // Cross-check Docker: if state file says "running" but container is dead, it crashed
      try {
        const dockerAvailable = await isDockerAvailable();
        if (dockerAvailable) {
          const containerState = await getContainerState();
          if (!containerState.running) {
            return "crashed";
          }
        }
      } catch {
        /* trust state file if Docker check fails */
      }
      return "running";
    }
    if (status === "starting") {
      return "starting";
    }
    if (status === "crashed") {
      return "crashed";
    }
  }

  // Fall back to Docker container check
  try {
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      // Docker not available - this is expected on some deployments (TrueNAS)
      return "stopped";
    }

    const containerState = await getContainerState();
    // If container is running but API isn't responding, it's starting up
    if (containerState.running) {
      return "starting";
    }
    return "stopped";
  } catch {
    // Silently fall back to stopped if Docker check fails
    return "stopped";
  }
}

export async function GET() {
  try {
    // First check if API is reachable
    const healthy = await checkHealth();
    if (!healthy) {
      const state = await getOfflineState();
      return NextResponse.json(stoppedResponse(state));
    }

    const data = await apiRequest<ApiStatusResponse>("/server/status");

    return NextResponse.json({
      online: data.online,
      name: data.name,
      motd: data.motd || "",
      version: "",
      playerCount: data.playerCount,
      maxPlayers: data.maxPlayers,
      uptime: data.uptime,
      memory: data.memory
        ? {
            used: data.memory.used,
            max: data.memory.max,
            free: data.memory.free,
          }
        : null,
      state: data.online ? "running" : "stopped",
    });
  } catch (error) {
    // Connection errors - check Docker state to determine if starting or stopped
    console.log(
      "[status] API request failed, checking container state:",
      error,
    );
    clearCache();
    const state = await getOfflineState();
    return NextResponse.json(stoppedResponse(state));
  }
}
