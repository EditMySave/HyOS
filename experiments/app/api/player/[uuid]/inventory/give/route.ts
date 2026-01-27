import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json();
    const { itemId, amount, slot } = body;

    if (!itemId) {
      return NextResponse.json(
        { error: "itemId is required" },
        { status: 400 },
      );
    }
    if (!amount || amount < 1) {
      return NextResponse.json(
        { error: "amount must be at least 1" },
        { status: 400 },
      );
    }

    const adapter = await getAdapter();
    await adapter.giveItem(uuid, itemId, amount, slot);
    return NextResponse.json({
      success: true,
      message: `Gave ${amount}x ${itemId} to player`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to give item" },
      { status: 500 },
    );
  }
}
