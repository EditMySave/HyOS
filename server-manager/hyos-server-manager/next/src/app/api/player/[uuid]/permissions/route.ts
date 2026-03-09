import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface PermissionsInfo {
  permissions: string[];
  effectivePermissions: string[];
}

export const GET = withErrorTracking(
  "/api/player/[uuid]/permissions",
  async (_request, ctx) => {
    const { uuid } = await ctx!.params;
    const data = await apiRequest<PermissionsInfo>(
      `/players/${uuid}/permissions`,
    );
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/player/[uuid]/permissions",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const body = await request.json();
    const { permission } = body;

    if (!permission) {
      return NextResponse.json(
        { error: "permission is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<PermissionsInfo>(
      `/players/${uuid}/permissions`,
      {
        method: "POST",
        body: JSON.stringify({ permission }),
      },
    );

    return NextResponse.json(data);
  },
);

export const DELETE = withErrorTracking(
  "/api/player/[uuid]/permissions",
  async (request, ctx) => {
    const { uuid } = await ctx!.params;
    const url = new URL(request.url);
    const permission = url.searchParams.get("permission");

    if (!permission) {
      return NextResponse.json(
        { error: "permission query param is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<PermissionsInfo>(
      `/players/${uuid}/permissions/${encodeURIComponent(permission)}`,
      { method: "DELETE" },
    );

    return NextResponse.json(data);
  },
);
