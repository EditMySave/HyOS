/**
 * Server Logs API
 *
 * Returns server logs from Hytale log files.
 * Falls back to Docker container logs if log files aren't available.
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getContainerLogs, parseAuthFromLogs } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";

/**
 * Read logs from Hytale's log files
 * Hytale stores logs in /data/server/logs/ with timestamped filenames
 * Reads multiple log files (oldest to newest) until tail count is satisfied
 */
async function readHytaleLogFiles(
  stateDir: string,
  tail: number,
  offset?: number,
): Promise<{ logs: string; totalLines: number }> {
  // Hytale logs are in /data/Server/logs/ (capital S, relative to state dir)
  const dataDir = path.dirname(stateDir); // /data/.state -> /data
  const logDir = path.join(dataDir, "Server", "logs");

  try {
    // Check if log directory exists
    await fs.access(logDir);

    // List all log files and sort by name (newest last due to timestamp naming)
    const files = await fs.readdir(logDir);
    const logFiles = files.filter((f) => f.endsWith("_server.log")).sort(); // Oldest first

    if (logFiles.length === 0) {
      return { logs: "", totalLines: 0 };
    }

    // Read all log files and combine
    let allLines: string[] = [];
    for (const file of logFiles) {
      const filePath = path.join(logDir, file);
      const content = await fs.readFile(filePath, "utf8");
      allLines = allLines.concat(content.split("\n"));
    }

    const totalLines = allLines.length;

    // Calculate which lines to return
    let startIdx = 0;
    let endIdx = totalLines;

    if (offset !== undefined && offset > 0) {
      // Incremental fetch: return lines after offset, limited by tail
      startIdx = Math.min(offset, totalLines);
      endIdx = Math.min(startIdx + tail, totalLines);
    } else if (tail !== undefined && tail > 0) {
      // Initial fetch: get last N lines
      startIdx = Math.max(0, totalLines - tail);
      endIdx = totalLines;
    }

    const selectedLines = allLines.slice(startIdx, endIdx);
    const logs = selectedLines.join("\n");

    return { logs, totalLines };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      console.error("Error reading log files:", error);
    }
    return { logs: "", totalLines: 0 };
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tail = parseInt(searchParams.get("tail") || "1000", 10); // Default to 1000
  const offsetParam = searchParams.get("offset");
  const offset = offsetParam ? parseInt(offsetParam, 10) : undefined;
  const since = parseInt(searchParams.get("since") || "0", 10);

  const config = await loadConfig();
  const containerName = config.containerName || "hyos-server";
  const stateDir = config.stateDir || "/data/.state";

  let logs = "";
  let source = "none";
  let totalLines = 0;

  // First try reading from Hytale log files (works without Docker socket)
  const fileResult = await readHytaleLogFiles(stateDir, tail, offset);
  if (fileResult.totalLines > 0) {
    logs = fileResult.logs;
    source = "file";
    totalLines = fileResult.totalLines;
  } else {
    // Fall back to Docker container logs
    try {
      logs = await getContainerLogs(containerName, {
        tail,
        since,
        timestamps: true,
      });
      source = "docker";
      // For Docker logs, estimate totalLines based on line count
      totalLines = logs.split("\n").length;
    } catch (error) {
      console.error("Failed to get container logs:", error);
      // Return empty logs instead of error - logs might just not be available yet
    }
  }

  // Parse for authentication prompts
  const auth = parseAuthFromLogs(logs);

  return NextResponse.json({
    logs,
    auth,
    source,
    timestamp: Date.now(),
    totalLines,
  });
}
