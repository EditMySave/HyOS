import { NextResponse } from "next/server";
import { isDockerAvailable, restartServerContainer } from "@/lib/docker";
import { clearCache } from "@/lib/hytale-api";

export async function POST() {
  try {
    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json(
        { error: "Docker not available - cannot control server" },
        { status: 503 },
      );
    }

    // Restart the container
    await restartServerContainer();

    // Clear API cache so health checks start fresh
    clearCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[restart] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to restart server",
      },
      { status: 500 },
    );
  }
}
