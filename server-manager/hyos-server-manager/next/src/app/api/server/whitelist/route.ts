import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface WhitelistInfo {
  enabled: boolean;
  playerCount: number;
  players: string[];
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[whitelist] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to manage whitelist",
      },
      { status: 500 },
    );
  }
}
