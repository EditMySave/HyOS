import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface BlockInfo {
  blockId: string;
  x: number;
  y: number;
  z: number;
  nbt: string | null;
}

export const GET = withErrorTracking(
  "/api/world/[id]/blocks",
  async (request, ctx) => {
    const { id } = await ctx!.params;
    const url = new URL(request.url);
    const x = url.searchParams.get("x");
    const y = url.searchParams.get("y");
    const z = url.searchParams.get("z");

    if (!x || !y || !z) {
      return NextResponse.json(
        { error: "x, y, z query params are required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<BlockInfo>(
      `/worlds/${id}/blocks/${parseInt(x, 10)}/${parseInt(y, 10)}/${parseInt(z, 10)}`,
    );

    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/world/[id]/blocks",
  async (request, ctx) => {
    const { id } = await ctx!.params;
    const body = await request.json();
    const { x, y, z, blockId, nbt } = body;

    if (x === undefined || y === undefined || z === undefined || !blockId) {
      return NextResponse.json(
        { error: "x, y, z, and blockId are required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<BlockInfo>(
      `/worlds/${id}/blocks/${x}/${y}/${z}`,
      {
        method: "POST",
        body: JSON.stringify({ blockId, nbt: nbt || null }),
      },
    );

    return NextResponse.json(data);
  },
);
