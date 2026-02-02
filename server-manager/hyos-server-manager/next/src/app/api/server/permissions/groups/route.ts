import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export interface GroupResponse {
  name: string;
  permissions: string[];
}

export async function GET() {
  try {
    const data = await apiRequest<GroupResponse[]>(
      "/server/permissions/groups",
    );
    return NextResponse.json(data);
  } catch (error) {
    console.error("[permissions/groups] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get groups",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[permissions/groups] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create group",
      },
      { status: 500 },
    );
  }
}
