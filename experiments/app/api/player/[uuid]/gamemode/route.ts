import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const adapter = await getAdapter();
    const result = await adapter.getGameMode(uuid);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get game mode",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
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

    const adapter = await getAdapter();
    const result = await adapter.setGameMode(uuid, gameMode);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to set game mode",
      },
      { status: 500 },
    );
  }
}
