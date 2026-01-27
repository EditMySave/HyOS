import { NextResponse } from "next/server";
import { apiRequest, checkHealth } from "@/lib/hytale-api";

interface ApiVersionResponse {
  gameVersion: string;
  revisionId: string;
  patchline: string;
  protocolVersion: number;
  protocolHash?: string;
  pluginVersion?: string;
}

export async function GET() {
  try {
    const healthy = await checkHealth();
    if (!healthy) {
      return NextResponse.json({
        gameVersion: "unknown",
        revisionId: "",
        patchline: "unknown",
        protocolVersion: 0,
      });
    }

    const data = await apiRequest<ApiVersionResponse>("/server/version");

    return NextResponse.json({
      gameVersion: data.gameVersion,
      revisionId: data.revisionId,
      patchline: data.patchline,
      protocolVersion: data.protocolVersion,
    });
  } catch (error) {
    console.error("[version] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get server version",
      },
      { status: 500 },
    );
  }
}
