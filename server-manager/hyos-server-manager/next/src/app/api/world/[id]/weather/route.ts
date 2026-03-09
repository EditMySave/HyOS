import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface WorldWeatherInfo {
  weather: string;
  duration: number | null;
  thundering: boolean;
}

export const GET = withErrorTracking(
  "/api/world/[id]/weather",
  async (_request, ctx) => {
    const { id } = await ctx!.params;
    const data = await apiRequest<WorldWeatherInfo>(`/worlds/${id}/weather`);
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/world/[id]/weather",
  async (request, ctx) => {
    const { id } = await ctx!.params;
    const body = await request.json();
    const { weather, duration } = body;

    if (!weather) {
      return NextResponse.json(
        { error: "weather is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<WorldWeatherInfo>(`/worlds/${id}/weather`, {
      method: "POST",
      body: JSON.stringify({ weather, duration: duration || null }),
    });

    return NextResponse.json(data);
  },
);
