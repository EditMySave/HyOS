import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/player/[uuid]/kick",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    await apiRequest("/admin/kick", {
      method: "POST",
      body: JSON.stringify({
        player: uuid,
        reason: reason || "Kicked by admin",
      }),
    });

    return NextResponse.json({ success: true });
  },
);
