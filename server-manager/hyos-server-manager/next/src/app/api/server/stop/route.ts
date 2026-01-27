import { NextResponse } from "next/server";
import { apiRequest, checkHealth, clearCache } from "@/lib/hytale-api";
import { isDockerAvailable, stopServerContainer } from "@/lib/docker";

export async function POST() {
  try {
    // First try graceful shutdown via API if server is running
    const healthy = await checkHealth();
    if (healthy) {
      try {
        await apiRequest("/admin/command", {
          method: "POST",
          body: JSON.stringify({ command: "stop" }),
        });
        console.log("[stop] Sent stop command via API");
        // Give the server a moment to shut down gracefully
        await new Promise((r) => setTimeout(r, 2000));
      } catch (err) {
        console.warn("[stop] API stop command failed, will use Docker:", err);
      }
    }

    // Use Docker to ensure container is stopped
    const dockerAvailable = await isDockerAvailable();
    if (dockerAvailable) {
      await stopServerContainer();
    }

    // Clear API cache
    clearCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[stop] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to stop server",
      },
      { status: 500 },
    );
  }
}
