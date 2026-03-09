import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface PlayerStats {
  playTime: number;
  deaths: number;
  mobKills: number;
  playerKills: number;
  blocksPlaced: number;
  blocksDestroyed: number;
}

export const GET = withErrorTracking(
  "/api/player/[uuid]/stats",
  async (_request, ctx) => {
    const { uuid } = await ctx!.params;
    const data = await apiRequest<PlayerStats>(`/players/${uuid}/stats`);
    return NextResponse.json(data);
  },
);
