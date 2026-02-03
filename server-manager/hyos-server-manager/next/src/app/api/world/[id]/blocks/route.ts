import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface BlockInfo {
  blockId: string;
  x: number;
  y: number;
  z: number;
  nbt: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
  } catch (error) {
    console.error("[blocks] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get block",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
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
  } catch (error) {
    console.error("[blocks] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to set block",
      },
      { status: 500 },
    );
  }
}
