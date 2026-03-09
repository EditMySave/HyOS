import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/player/[uuid]/inventory/give",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
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
  },
);
