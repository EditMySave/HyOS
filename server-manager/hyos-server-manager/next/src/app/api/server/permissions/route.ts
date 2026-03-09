import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

export interface GroupEntry {
  permissions: string[];
}

export interface UserEntry {
  groups: string[];
  permissions: string[];
}

export interface PermissionsData {
  groups: Record<string, GroupEntry>;
  users: Record<string, UserEntry>;
}

export const GET = withErrorTracking("/api/server/permissions", async () => {
  const data = await apiRequest<PermissionsData>("/server/permissions");
  return NextResponse.json(data);
});
