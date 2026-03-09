import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface TeleportResult {
  success: boolean;
  world: string;
  position: { x: number; y: number; z: number };
}

export const POST = withErrorTracking(
  "/api/player/[uuid]/teleport",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
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
  },
);
