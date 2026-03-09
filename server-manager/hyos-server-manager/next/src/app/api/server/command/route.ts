import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";

interface ApiCommandResponse {
  success: boolean;
  output: string;
}

export const POST = withErrorTracking(
  "/api/server/command",
  async (request) => {
    const body = await request.json();
    const { command } = body;

    if (!command || typeof command !== "string") {
      return NextResponse.json(
        { error: "Command is required" },
        { status: 400 },
      );
    }

    const data = await apiRequest<ApiCommandResponse>("/admin/command", {
      method: "POST",
      body: JSON.stringify({ command }),
    });

    return NextResponse.json({
      success: data.success,
      output: data.output,
    });
  },
);
