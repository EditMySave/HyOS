import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/player/[uuid]/message",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    await apiRequest(`/players/${uuid}/message`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    return NextResponse.json({ success: true });
  },
);
