import { NextResponse } from "next/server";
import { isDockerAvailable, startServerContainer } from "@/lib/docker";
import { clearCache } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking("/api/server/start", async () => {
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
});
