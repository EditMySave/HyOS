import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json();
    const { x, y, z } = body;

    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      typeof z !== "number"
    ) {
      return NextResponse.json(
        { error: "x, y, z coordinates are required" },
        { status: 400 },
      );
    }

    const adapter = await getAdapter();
    await adapter.teleportPlayer(uuid, x, y, z);

    return NextResponse.json({
      success: true,
      message: `Player ${uuid} teleported`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to teleport player",
      },
      { status: 500 },
    );
  }
}
