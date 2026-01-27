import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export async function POST() {
  try {
    await apiRequest("/server/save", {
      method: "POST",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[save] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to save world",
      },
      { status: 500 },
    );
  }
}
