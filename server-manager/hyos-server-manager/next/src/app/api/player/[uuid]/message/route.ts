import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[message] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 },
    );
  }
}
