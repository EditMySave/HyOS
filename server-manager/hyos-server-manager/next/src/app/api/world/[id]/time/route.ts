import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface WorldTimeInfo {
  time: number;
  dayTime: number;
  day: number;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await apiRequest<WorldTimeInfo>(`/worlds/${id}/time`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[time] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get world time",
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
    const { time, relative } = body;

    if (time === undefined) {
      return NextResponse.json({ error: "time is required" }, { status: 400 });
    }

    const data = await apiRequest<WorldTimeInfo>(`/worlds/${id}/time`, {
      method: "POST",
      body: JSON.stringify({ time, relative: relative || null }),
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[time] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to set world time",
      },
      { status: 500 },
    );
  }
}
