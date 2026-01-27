import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json().catch(() => ({}));
    const { section } = body;

    await apiRequest(`/players/${uuid}/inventory/clear`, {
      method: "POST",
      body: JSON.stringify({ section: section || null }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[clear] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to clear inventory",
      },
      { status: 500 },
    );
  }
}
