import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface GroupsInfo {
  groups: string[];
  primaryGroup: string | null;
}

export const GET = withErrorTracking(
  "/api/player/[uuid]/groups",
  async (_request, ctx) => {
    const { uuid } = await ctx!.params;
    const data = await apiRequest<GroupsInfo>(`/players/${uuid}/groups`);
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/player/[uuid]/groups",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json();
    const { group } = body;

    if (!group) {
      return NextResponse.json({ error: "group is required" }, { status: 400 });
    }

    const data = await apiRequest<GroupsInfo>(`/players/${uuid}/groups`, {
      method: "POST",
      body: JSON.stringify({ group }),
    });

    return NextResponse.json(data);
  },
);
