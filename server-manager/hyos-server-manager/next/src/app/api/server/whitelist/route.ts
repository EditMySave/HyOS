import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface WhitelistInfo {
  enabled: boolean;
  playerCount: number;
  players: string[];
}

export const POST = withErrorTracking(
  "/api/server/whitelist",
  async (request) => {
    const body = await request.json();
    const { action, players } = body;

    if (!action) {
      return NextResponse.json(
        { error: "Action is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<WhitelistInfo>("/server/whitelist", {
      method: "POST",
      body: JSON.stringify({ action, players: players || null }),
    });

    return NextResponse.json(data);
  },
);
