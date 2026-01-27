import { NextResponse } from "next/server";
import { apiRequest, checkHealth } from "@/lib/hytale-api";

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
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get players",
      },
      { status: 500 },
    );
  }
}
