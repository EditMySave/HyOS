import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = await getAdapter();
    const result = await adapter.getWhitelist();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get whitelist",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, players } = body;

    const validActions = ["add", "remove", "enable", "disable"];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: "action must be add, remove, enable, or disable" },
        { status: 400 },
      );
    }

    if (
      (action === "add" || action === "remove") &&
      (!players || !Array.isArray(players))
    ) {
      return NextResponse.json(
        { error: "players array is required for add/remove actions" },
        { status: 400 },
      );
    }

    const adapter = await getAdapter();
    const result = await adapter.manageWhitelist(action, players);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to manage whitelist",
      },
      { status: 500 },
    );
  }
}
