import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface TeleportResult {
  success: boolean;
  world: string;
  position: { x: number; y: number; z: number };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json();
    const { x, y, z, world, yaw, pitch } = body;

    const data = await apiRequest<TeleportResult>(`/players/${uuid}/teleport`, {
      method: "POST",
      body: JSON.stringify({
        x: x ?? null,
        y: y ?? null,
        z: z ?? null,
        world: world ?? null,
        yaw: yaw ?? null,
        pitch: pitch ?? null,
      }),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[teleport] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to teleport player",
      },
      { status: 500 },
    );
  }
}
