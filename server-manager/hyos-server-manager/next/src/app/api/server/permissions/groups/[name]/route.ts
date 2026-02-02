import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

export interface GroupResponse {
  name: string;
  permissions: string[];
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;
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
  } catch (error) {
    console.error("[permissions/groups/name] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update group",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const { name } = await params;

    await apiRequest(`/server/permissions/groups/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[permissions/groups/name] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete group",
      },
      { status: 500 },
    );
  }
}
