import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export interface GroupResponse {
  name: string;
  permissions: string[];
}

export const PUT = withErrorTracking(
  "/api/server/permissions/groups/[name]",
  async (request, ctx) => {
    const { name } = await ctx!.params;
    const body = await request.json();
    const { permissions } = body;

    const data = await apiRequest<GroupResponse>(
      `/server/permissions/groups/${encodeURIComponent(name)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          permissions: Array.isArray(permissions) ? permissions : [],
        }),
      },
    );

    return NextResponse.json(data);
  },
);

export const DELETE = withErrorTracking(
  "/api/server/permissions/groups/[name]",
  async (_request, ctx) => {
    const { name } = await ctx!.params;

    await apiRequest(`/server/permissions/groups/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });

    return NextResponse.json({ success: true });
  },
);
