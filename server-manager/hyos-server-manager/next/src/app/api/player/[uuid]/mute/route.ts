import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface MuteInfo {
  muted: boolean;
  reason: string | null;
  expiresAt: number | null;
}

export const POST = withErrorTracking(
  "/api/player/[uuid]/mute",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json().catch(() => ({}));
    const { durationMinutes, reason } = body;

    const data = await apiRequest<MuteInfo>(`/chat/mute/${uuid}`, {
      method: "POST",
      body: JSON.stringify({
        durationMinutes: durationMinutes || null,
        reason: reason || null,
      }),
    });

    return NextResponse.json(data);
  },
);
