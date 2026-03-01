import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";
import { loadConfig } from "@/lib/services/config/config.loader";

export async function GET() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const healthPath = join(stateDir, "health.json");

    try {
      const content = await readFile(healthPath, "utf-8");
      const healthState = JSON.parse(content);

      return NextResponse.json({
        status: healthState.status || "unknown",
        healthy: healthState.healthy ?? true,
        message: healthState.message || "",
        checks: healthState.checks || [],
        checkedAt: healthState.checked_at || null,
      });
    } catch {
      return NextResponse.json({
        status: "unknown",
        healthy: true,
        message: "",
        checks: [],
        checkedAt: null,
      });
    }
  } catch (error) {
    console.error("[health] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get health state",
      },
      { status: 500 },
    );
  }
}
