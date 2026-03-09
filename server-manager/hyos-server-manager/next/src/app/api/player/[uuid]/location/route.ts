import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface PlayerLocation {
  world: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export const GET = withErrorTracking(
  "/api/player/[uuid]/location",
  async (_request, ctx) => {
    const { uuid } = await ctx!.params;
    const data = await apiRequest<PlayerLocation>(`/players/${uuid}/location`);
    return NextResponse.json(data);
  },
);
