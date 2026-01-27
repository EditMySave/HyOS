import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json();
    const { itemId, amount, slot } = body;

    if (!itemId || !amount) {
      return NextResponse.json(
        { error: "itemId and amount are required" },
        { status: 400 },
      );
    }

    await apiRequest(`/players/${uuid}/inventory/give`, {
      method: "POST",
      body: JSON.stringify({ itemId, amount, slot: slot || null }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[give] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to give item",
      },
      { status: 500 },
    );
  }
}
