import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface WorldTimeInfo {
  time: number;
  dayTime: number;
  day: number;
}

export const GET = withErrorTracking(
  "/api/world/[id]/time",
  async (_request, ctx) => {
    const { id } = await ctx!.params;
    const data = await apiRequest<WorldTimeInfo>(`/worlds/${id}/time`);
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/world/[id]/time",
  async (request, ctx) => {
    const { id } = await ctx!.params;
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
  },
);
