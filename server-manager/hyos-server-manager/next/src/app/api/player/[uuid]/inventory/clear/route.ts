import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/player/[uuid]/inventory/clear",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json().catch(() => ({}));
    const { section } = body;

    await apiRequest(`/players/${uuid}/inventory/clear`, {
      method: "POST",
      body: JSON.stringify({ section: section || null }),
    });

    return NextResponse.json({ success: true });
  },
);
