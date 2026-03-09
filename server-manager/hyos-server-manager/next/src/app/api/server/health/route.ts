import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { trackServerWarning } from "@/lib/services/analytics/umami.server";
import { loadConfig } from "@/lib/services/config/config.loader";

export const GET = withErrorTracking("/api/server/health", async () => {
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
  } catch (error) {
    await trackServerWarning(error, {
      route: "/api/server/health",
      url: "/api/server/health",
      category: "filesystem",
    });
    return NextResponse.json({
      status: "unknown",
      healthy: true,
      message: "",
      checks: [],
      checkedAt: null,
    });
  }
});
