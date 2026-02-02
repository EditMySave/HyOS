import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface CommandResponse {
  success: boolean;
  output: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { player } = body;

    if (!player) {
      return NextResponse.json(
        { error: "player is required (UUID or username)" },
        { status: 400 },
      );
    }

    const data = await apiRequest<CommandResponse>("/server/permissions/op", {
      method: "POST",
      body: JSON.stringify({ player: String(player).trim() }),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[permissions/op] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add operator",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const player = url.searchParams.get("player");

    if (!player) {
      return NextResponse.json(
        { error: "player query param is required (UUID or username)" },
        { status: 400 },
      );
    }

    const data = await apiRequest<CommandResponse>(
      `/server/permissions/op/${encodeURIComponent(player)}`,
      { method: "DELETE" },
    );

    return NextResponse.json(data);
  } catch (error) {
    console.error("[permissions/op] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to remove operator",
      },
      { status: 500 },
    );
  }
}
