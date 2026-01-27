import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface PlayerLocation {
  world: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const data = await apiRequest<PlayerLocation>(`/players/${uuid}/location`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[location] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get location",
      },
      { status: 500 },
    );
  }
}
