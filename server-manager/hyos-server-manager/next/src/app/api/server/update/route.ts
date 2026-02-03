import { NextResponse } from "next/server";
import { isDockerAvailable, execInContainer } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";
import { readFile } from "fs/promises";
import { join } from "path";

export interface UpdateCheckResult {
  currentVersion: string;
  latestVersion: string;
  needsUpdate: boolean;
  lastCheck: string | null;
  message: string;
}

/**
 * GET /api/server/update - Get update status from state file
 */
export async function GET() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const versionPath = join(stateDir, "version.json");

    try {
      const content = await readFile(versionPath, "utf-8");
      const versionState = JSON.parse(content);

      return NextResponse.json({
        currentVersion: versionState.current || "unknown",
        latestVersion: versionState.latest || "unknown",
        needsUpdate: versionState.needs_update || false,
        lastCheck: versionState.checked_at || null,
        message: versionState.needs_update
          ? `Update available: ${versionState.current} → ${versionState.latest}`
          : "Server is up to date",
      } satisfies UpdateCheckResult);
    } catch {
      return NextResponse.json({
        currentVersion: "unknown",
        latestVersion: "unknown",
        needsUpdate: false,
        lastCheck: null,
        message: "No version information available",
      } satisfies UpdateCheckResult);
    }
  } catch (error) {
    console.error("[update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to get update status",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/server/update - Trigger an update check (or return cached state when Docker unavailable)
 */
export async function POST() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const versionPath = join(stateDir, "version.json");

    const dockerAvailable = await isDockerAvailable();

    if (dockerAvailable) {
      // Run live check in container
      console.log("[update] Running update check...");

      const result = await execInContainer([
        "/opt/scripts/cmd/auto-update.sh",
        "--once",
      ]);

      console.log("[update] Check complete, exit code:", result.exitCode);

      try {
        const content = await readFile(versionPath, "utf-8");
        const versionState = JSON.parse(content);

        return NextResponse.json({
          success: result.exitCode === 0,
          currentVersion: versionState.current || "unknown",
          latestVersion: versionState.latest || "unknown",
          needsUpdate: versionState.needs_update || false,
          lastCheck: versionState.checked_at || null,
          message: versionState.needs_update
            ? `Update available: ${versionState.current} → ${versionState.latest}`
            : "Server is up to date",
          output: result.output,
        });
      } catch {
        return NextResponse.json({
          success: result.exitCode === 0,
          currentVersion: "unknown",
          latestVersion: "unknown",
          needsUpdate: false,
          lastCheck: new Date().toISOString(),
          message: "Check completed but could not read version state",
          output: result.output,
        });
      }
    } else {
      // TrueNAS / no Docker: return cached version state from shared volume
      console.log(
        "[update] Docker not available, returning cached version state...",
      );

      try {
        const content = await readFile(versionPath, "utf-8");
        const versionState = JSON.parse(content);

        return NextResponse.json({
          success: true,
          currentVersion: versionState.current || "unknown",
          latestVersion: versionState.latest || "unknown",
          needsUpdate: versionState.needs_update || false,
          lastCheck: versionState.checked_at || null,
          message: versionState.needs_update
            ? `Update available: ${versionState.current} → ${versionState.latest}`
            : "Server is up to date (cached state; live check requires Docker)",
        });
      } catch {
        return NextResponse.json({
          success: true,
          currentVersion: "unknown",
          latestVersion: "unknown",
          needsUpdate: false,
          lastCheck: null,
          message:
            "No version data available. The server may need to be authenticated to check for updates.",
        });
      }
    }
  } catch (error) {
    console.error("[update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check for updates",
      },
      { status: 500 },
    );
  }
}
