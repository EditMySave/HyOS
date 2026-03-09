import { NextResponse } from "next/server";
import { apiRequest, checkHealth } from "@/lib/hytale-api";
import { trackServerWarning } from "@/lib/services/analytics/umami.server";

interface ApiPlayer {
  uuid: string;
  name: string;
  world: string;
  position: { x: number; y: number; z: number };
  connectedAt: number;
}

interface ApiPlayersResponse {
  count: number;
  players: ApiPlayer[];
}

export async function GET() {
  try {
    const healthy = await checkHealth();
    if (!healthy) {
      return NextResponse.json({ players: [], count: 0 });
    }

    const data = await apiRequest<ApiPlayersResponse>("/players");

    return NextResponse.json({
      players: data.players,
      count: data.count,
    });
  } catch (error) {
    console.error("[players] Error:", error);
    await trackServerWarning(error, {
      route: "/api/server/players",
      url: "/api/server/players",
      category: "network",
    });
    return NextResponse.json({ players: [], count: 0 });
  }
}
