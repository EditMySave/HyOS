import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface CommandResponse {
  success: boolean;
  output?: string;
}

export const POST = withErrorTracking(
  "/api/server/permissions/op",
  async (request) => {
    const body = await request.json();
    const { player } = body;

    if (!player) {
      return NextResponse.json(
        { error: "player is required (UUID or username)" },
        { status: 400 },
      );
    }

    const data = await apiRequest<CommandResponse>("/server/permissions/op", {
      method: "POST",
      body: JSON.stringify({ player: String(player).trim() }),
    });

    return NextResponse.json(data);
  },
);

export const DELETE = withErrorTracking(
  "/api/server/permissions/op",
  async (request) => {
    const url = new URL(request.url);
    const player = url.searchParams.get("player");

    if (!player) {
      return NextResponse.json(
        { error: "player query param is required (UUID or username)" },
        { status: 400 },
      );
    }

    const data = await apiRequest<CommandResponse>(
      `/server/permissions/op/${encodeURIComponent(player)}`,
      { method: "DELETE" },
    );

    return NextResponse.json(data);
  },
);
