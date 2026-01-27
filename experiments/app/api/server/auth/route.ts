import { NextResponse } from "next/server";
import { getAdapter } from "@/lib/adapters";

export async function GET() {
  try {
    const adapter = await getAdapter();
    const authState = await adapter.getAuthState();

    return NextResponse.json(authState);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to get auth state",
      },
      { status: 500 },
    );
  }
}
