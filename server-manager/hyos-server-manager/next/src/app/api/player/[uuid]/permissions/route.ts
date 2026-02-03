import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface PermissionsInfo {
  permissions: string[];
  effectivePermissions: string[];
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const data = await apiRequest<PermissionsInfo>(
      `/players/${uuid}/permissions`,
    );
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[permissions] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to grant permission",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
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
  } catch (error) {
    console.error("[permissions] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to revoke permission",
      },
      { status: 500 },
    );
  }
}
