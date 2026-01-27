import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface GroupsInfo {
  groups: string[];
  primaryGroup: string | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const data = await apiRequest<GroupsInfo>(`/players/${uuid}/groups`);
    return NextResponse.json(data);
  } catch (error) {
    console.error("[groups] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get groups",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[groups] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to add to group",
      },
      { status: 500 },
    );
  }
}
