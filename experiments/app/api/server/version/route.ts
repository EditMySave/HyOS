import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = await getAdapter();
    const version = await adapter.getVersion();

    return NextResponse.json(version);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to get version",
      },
      { status: 500 },
    );
  }
}
