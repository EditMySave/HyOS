import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

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

export async function GET() {
  try {
    const data = await apiRequest<PermissionsData>("/server/permissions");
    return NextResponse.json(data);
  } catch (error) {
    console.error("[permissions] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get permissions",
      },
      { status: 500 },
    );
  }
}
