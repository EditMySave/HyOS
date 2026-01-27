import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const adapter = await getAdapter();
    await adapter.broadcast(message);

    return NextResponse.json({ success: true, message: "Broadcast sent" });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to broadcast" },
      { status: 500 },
    );
  }
}
