import { NextResponse } from "next/server";
import {
  isDockerAvailable,
  startServerContainer,
} from "@/lib/docker";
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

    // Start the container
    await startServerContainer();

    // Clear API cache so health checks start fresh
    clearCache();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[start] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to start server",
      },
      { status: 500 },
    );
  }
}
