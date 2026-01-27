import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const adapter = await getAdapter();
    await adapter.kickPlayer(uuid, reason);

    return NextResponse.json({
      success: true,
      message: `Player ${uuid} kicked`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to kick player",
      },
      { status: 500 },
    );
  }
}
