import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> },
) {
  try {
    const { uuid } = await params;
    const body = await request.json().catch(() => ({}));
    const { section } = body;

    const adapter = await getAdapter();
    await adapter.clearInventory(uuid, section);
    return NextResponse.json({
      success: true,
      message: `Inventory ${section || "all"} cleared`,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to clear inventory",
      },
      { status: 500 },
    );
  }
}
