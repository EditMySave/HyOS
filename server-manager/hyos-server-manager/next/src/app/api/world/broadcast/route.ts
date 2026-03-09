import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export const POST = withErrorTracking(
  "/api/world/broadcast",
  async (request) => {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    await apiRequest("/admin/broadcast", {
      method: "POST",
      body: JSON.stringify({ message }),
    });

    return NextResponse.json({ success: true });
  },
);
