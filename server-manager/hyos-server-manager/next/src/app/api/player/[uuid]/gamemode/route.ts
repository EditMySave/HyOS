import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface GameModeInfo {
  gameMode: string;
  availableModes: string[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const data = await apiRequest<GameModeInfo>(`/players/${uuid}/gamemode`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[gamemode] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get gamemode",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[gamemode] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to set gamemode",
      },
      { status: 500 },
    );
  }
}
