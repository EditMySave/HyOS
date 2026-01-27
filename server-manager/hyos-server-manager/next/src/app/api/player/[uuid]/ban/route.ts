import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[ban] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to ban player",
      },
      { status: 500 },
    );
  }
}
