import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface PlayerStats {
  playTime: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  blocksPlaced: number;
  blocksDestroyed: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const data = await apiRequest<PlayerStats>(`/players/${uuid}/stats`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[stats] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get stats",
      },
      { status: 500 },
    );
  }
}
