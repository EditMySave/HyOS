import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface WorldWeatherInfo {
  weather: string;
  duration: number | null;
  thundering: boolean;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const data = await apiRequest<WorldWeatherInfo>(`/worlds/${id}/weather`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[weather] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get world weather",
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
  } catch (error) {
    console.error("[weather] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to set world weather",
      },
      { status: 500 },
    );
  }
}
