import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = await getAdapter();
    const worlds = await adapter.getWorlds();
    return NextResponse.json({ worlds });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get worlds",
      },
      { status: 500 },
    );
  }
}
