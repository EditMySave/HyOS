import { NextResponse } from "next/server";
import { isDockerAvailable, execInContainer } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";
import { readFile, writeFile, unlink } from "fs/promises";
import { join } from "path";

export interface ScheduledUpdateStatus {
  scheduled: boolean;
  scheduledAt: string | null;
  targetVersion: string | null;
  scheduledBy: string | null;
}

/**
 * GET /api/server/schedule-update - Check if update is scheduled
 */
export async function GET() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const scheduledPath = join(stateDir, ".update-on-restart");

    try {
      const content = await readFile(scheduledPath, "utf-8");
      const scheduledState = JSON.parse(content);

      return NextResponse.json({
        scheduled: true,
        scheduledAt: scheduledState.scheduled_at || null,
        targetVersion: scheduledState.target_version || null,
        scheduledBy: scheduledState.scheduled_by || null,
      } satisfies ScheduledUpdateStatus);
    } catch {
      // File doesn't exist or can't be read
      return NextResponse.json({
        scheduled: false,
        scheduledAt: null,
        targetVersion: null,
        scheduledBy: null,
      } satisfies ScheduledUpdateStatus);
    }
  } catch (error) {
    console.error("[schedule-update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to check scheduled update status",
      },
      { status: 500 },
    );
  }
}

/**
 * POST /api/server/schedule-update - Schedule update for next restart
 */
export async function POST() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const scheduledPath = join(stateDir, ".update-on-restart");
    const versionPath = join(stateDir, "version.json");

    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();

    if (dockerAvailable) {
      // Use Docker exec method (preferred when available)
      console.log("[schedule-update] Scheduling update via Docker...");

      const result = await execInContainer([
        "/opt/scripts/cmd/schedule-update.sh",
      ]);

      console.log(
        "[schedule-update] Schedule complete, exit code:",
        result.exitCode,
      );

      // 141 = SIGPIPE (script stdout closed by reader); script may have succeeded
      if (result.exitCode !== 0 && result.exitCode !== 141) {
        return NextResponse.json(
          {
            error: "Failed to schedule update",
            output: result.output,
          },
          { status: 500 },
        );
      }

      // Read the scheduled state file (confirms success even when exit was 141)
      try {
        const content = await readFile(scheduledPath, "utf-8");
        const scheduledState = JSON.parse(content);

        return NextResponse.json({
          success: true,
          scheduled: true,
          scheduledAt: scheduledState.scheduled_at || null,
          targetVersion: scheduledState.target_version || null,
          scheduledBy: scheduledState.scheduled_by || null,
          message: "Update scheduled for next restart",
          output: result.output,
        });
      } catch {
        if (result.exitCode === 141) {
          return NextResponse.json(
            {
              error: "Schedule may have failed (connection closed)",
              output: result.output,
            },
            { status: 502 },
          );
        }
        return NextResponse.json({
          success: true,
          scheduled: true,
          scheduledAt: new Date().toISOString(),
          targetVersion: null,
          scheduledBy: "hyos-manager",
          message: "Update scheduled (could not read scheduled state)",
          output: result.output,
        });
      }
    } else {
      // Fallback: Write directly to state file (TrueNAS deployment)
      console.log(
        "[schedule-update] Docker not available, writing directly to state file...",
      );

      // Get target version from version.json
      let targetVersion: string | null = null;
      try {
        const versionContent = await readFile(versionPath, "utf-8");
        const versionState = JSON.parse(versionContent);
        targetVersion = versionState.latest || null;
      } catch {
        // If we can't read version, schedule update anyway (will use latest on restart)
        console.warn("[schedule-update] Could not read version.json");
      }

      // Write scheduled update flag file
      const scheduledState = {
        scheduled_at: new Date().toISOString(),
        target_version: targetVersion,
        scheduled_by: "hyos-manager",
      };

      await writeFile(
        scheduledPath,
        JSON.stringify(scheduledState, null, 2),
        "utf-8",
      );

      console.log("[schedule-update] Flag file created successfully");

      return NextResponse.json({
        success: true,
        scheduled: true,
        scheduledAt: scheduledState.scheduled_at,
        targetVersion: scheduledState.target_version,
        scheduledBy: scheduledState.scheduled_by,
        message: "Update scheduled for next restart",
      });
    }
  } catch (error) {
    console.error("[schedule-update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to schedule update",
      },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/server/schedule-update - Cancel scheduled update
 */
export async function DELETE() {
  try {
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const scheduledPath = join(stateDir, ".update-on-restart");

    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();

    if (dockerAvailable) {
      // Use Docker exec method (preferred when available)
      console.log("[schedule-update] Cancelling scheduled update via Docker...");

      const result = await execInContainer([
        "/opt/scripts/cmd/schedule-update.sh",
        "--clear",
      ]);

      console.log(
        "[schedule-update] Cancel complete, exit code:",
        result.exitCode,
      );

      return NextResponse.json({
        success: result.exitCode === 0,
        scheduled: false,
        message: result.exitCode === 0
          ? "Scheduled update cancelled"
          : "No scheduled update to cancel",
        output: result.output,
      });
    } else {
      // Fallback: Remove flag file directly (TrueNAS deployment)
      console.log(
        "[schedule-update] Docker not available, removing flag file directly...",
      );

      try {
        await unlink(scheduledPath);
        console.log("[schedule-update] Flag file removed successfully");

        return NextResponse.json({
          success: true,
          scheduled: false,
          message: "Scheduled update cancelled",
        });
      } catch (error) {
        // File doesn't exist - that's fine, means nothing was scheduled
        const code = (error as NodeJS.ErrnoException)?.code;
        if (code === "ENOENT") {
          return NextResponse.json({
            success: true,
            scheduled: false,
            message: "No scheduled update to cancel",
          });
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("[schedule-update] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to cancel scheduled update",
      },
      { status: 500 },
    );
  }
}
