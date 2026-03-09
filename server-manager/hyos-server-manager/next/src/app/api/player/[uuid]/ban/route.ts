import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/player/[uuid]/ban",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json().catch(() => ({}));
    const { reason, duration } = body;

    await apiRequest("/admin/ban", {
      method: "POST",
      body: JSON.stringify({
        player: uuid,
        reason: reason || "Banned by admin",
        duration: duration,
        permanent: duration === undefined,
      }),
    });

    return NextResponse.json({ success: true });
  },
);
