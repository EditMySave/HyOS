import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface MuteInfo {
  muted: boolean;
  reason: string | null;
  expiresAt: number | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[mute] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to mute player",
      },
      { status: 500 },
    );
  }
}
