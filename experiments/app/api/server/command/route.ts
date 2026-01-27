import { NextRequest, NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 },
      );
    }

    const adapter = await getAdapter();
    const result = await adapter.executeCommand(command);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to execute command",
      },
      { status: 500 },
    );
  }
}
