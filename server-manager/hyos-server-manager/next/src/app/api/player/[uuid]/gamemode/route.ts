import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface GameModeInfo {
  gameMode: string;
  availableModes: string[];
}

export const GET = withErrorTracking(
  "/api/player/[uuid]/gamemode",
  async (_request, ctx) => {
    const { uuid } = await ctx!.params;
    const data = await apiRequest<GameModeInfo>(`/players/${uuid}/gamemode`);
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/player/[uuid]/gamemode",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json();
    const { gameMode } = body;

    if (!gameMode) {
      return NextResponse.json(
        { error: "gameMode is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<GameModeInfo>(`/players/${uuid}/gamemode`, {
      method: "POST",
      body: JSON.stringify({ gameMode }),
    });

    return NextResponse.json(data);
  },
);
