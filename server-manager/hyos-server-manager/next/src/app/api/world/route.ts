import { NextResponse } from "next/server";
import { apiRequest, checkHealth } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface WorldInfo {
  uuid: string | null;
  name: string;
  playerCount: number;
  type: string;
}

interface ApiWorldsResponse {
  count: number;
  worlds: WorldInfo[];
}

export const GET = withErrorTracking("/api/world", async () => {
  const healthy = await checkHealth();
  if (!healthy) {
    return NextResponse.json({ count: 0, worlds: [] });
  }

  const data = await apiRequest<ApiWorldsResponse>("/worlds");

  // Normalize uuid (use name as fallback)
  const worlds = data.worlds.map((w) => ({
    ...w,
    uuid: w.uuid ?? w.name,
  }));

  return NextResponse.json({ count: worlds.length, worlds });
});
