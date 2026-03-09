import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export interface GroupResponse {
  name: string;
  permissions: string[];
}

export const GET = withErrorTracking(
  "/api/server/permissions/groups",
  async () => {
    const data = await apiRequest<GroupResponse[]>(
      "/server/permissions/groups",
    );
    return NextResponse.json(data);
  },
);

export const POST = withErrorTracking(
  "/api/server/permissions/groups",
  async (request) => {
    const body = await request.json();
    const { name, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    const data = await apiRequest<GroupResponse>("/server/permissions/groups", {
      method: "POST",
      body: JSON.stringify({
        name: String(name).trim(),
        permissions: Array.isArray(permissions) ? permissions : [],
      }),
    });

    return NextResponse.json(data);
  },
);
