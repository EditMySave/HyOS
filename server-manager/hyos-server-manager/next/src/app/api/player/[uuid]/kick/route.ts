import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[kick] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to kick player",
      },
      { status: 500 },
    );
  }
}
