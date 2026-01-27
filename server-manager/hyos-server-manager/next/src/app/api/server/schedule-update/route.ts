import { NextResponse } from "next/server";
import { isDockerAvailable, execInContainer } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";
import { readFile, writeFile } from "fs/promises";
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
    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json(
        { error: "Docker not available - cannot schedule update" },
        { status: 503 },
      );
    }

    console.log("[schedule-update] Scheduling update for next restart...");

    // Execute schedule-update.sh in the container
    const result = await execInContainer([
      "/opt/scripts/cmd/schedule-update.sh",
    ]);

    console.log(
      "[schedule-update] Schedule complete, exit code:",
      result.exitCode,
    );

    if (result.exitCode !== 0) {
      return NextResponse.json(
        {
          error: "Failed to schedule update",
          output: result.output,
        },
        { status: 500 },
      );
    }

    // Read the scheduled state file
    const config = await loadConfig();
    const stateDir = config.stateDir || "/data/.state";
    const scheduledPath = join(stateDir, ".update-on-restart");

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
    // Check if Docker is available
    const dockerAvailable = await isDockerAvailable();
    if (!dockerAvailable) {
      return NextResponse.json(
        { error: "Docker not available - cannot cancel scheduled update" },
        { status: 503 },
      );
    }

    console.log("[schedule-update] Cancelling scheduled update...");

    // Execute schedule-update.sh --clear in the container
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
