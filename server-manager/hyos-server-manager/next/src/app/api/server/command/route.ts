import { NextResponse } from "next/server";
import { apiRequest } from "@/lib/hytale-api";

interface ApiCommandResponse {
  success: boolean;
  output: string;
}

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[command] Error:", error);
    return NextResponse.json(
      {
        success: false,
        output: "",
        error:
          error instanceof Error ? error.message : "Failed to execute command",
      },
      { status: 500 },
    );
  }
}
