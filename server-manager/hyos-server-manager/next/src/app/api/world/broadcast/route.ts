import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[broadcast] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to broadcast",
      },
      { status: 500 },
    );
  }
}
