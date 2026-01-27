import { NextResponse } from "next/server";
import { apiRequest, checkHealth } from "@/lib/hytale-api";

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

export async function GET() {
  try {
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
  } catch (error) {
    console.error("[worlds] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get worlds",
      },
      { status: 500 },
    );
  }
}
