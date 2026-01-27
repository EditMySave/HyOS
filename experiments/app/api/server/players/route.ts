import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = await getAdapter();
    const players = await adapter.getPlayers();

    return NextResponse.json({ players, count: players.length });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get players",
      },
      { status: 500 },
    );
  }
}
