/**
 * Server Logs API
 *
 * Returns server logs from Hytale log files.
 * Falls back to Docker container logs if log files aren't available.
 */

import { NextResponse } from "next/server";
import { getContainerLogs, parseAuthFromLogs } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";
import { promises as fs } from "fs";
import path from "path";

/**
 * Read logs from Hytale's log files
 * Hytale stores logs in /data/server/logs/ with timestamped filenames
 */
async function readHytaleLogFiles(
  stateDir: string,
  tail: number,
): Promise<string | null> {
  // Hytale logs are in /data/Server/logs/ (capital S, relative to state dir)
  const dataDir = path.dirname(stateDir); // /data/.state -> /data
  const logDir = path.join(dataDir, "Server", "logs");

  try {
    // Check if log directory exists
    await fs.access(logDir);

    // List all log files and sort by name (newest last due to timestamp naming)
    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter((f) => f.endsWith("_server.log"))
      .sort()
      .reverse(); // Newest first

    if (logFiles.length === 0) {
      return null;
    }

    // Read the most recent log file
    const latestLog = path.join(logDir, logFiles[0]);
    const content = await fs.readFile(latestLog, "utf8");

    // Get last N lines
    const lines = content.split("\n");
    const lastLines = lines.slice(-tail).join("\n");

    return lastLines;
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error("Error reading log files:", error);
    }
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tail = parseInt(searchParams.get("tail") || "100", 10);
  const since = parseInt(searchParams.get("since") || "0", 10);

  const config = await loadConfig();
  const containerName = config.containerName || "hyos";
  const stateDir = config.stateDir || "/data/.state";

  let logs = "";
  let source = "none";

  // First try reading from Hytale log files (works without Docker socket)
  const fileLogs = await readHytaleLogFiles(stateDir, tail);
  if (fileLogs) {
    logs = fileLogs;
    source = "file";
  } else {
    // Fall back to Docker container logs
    try {
      logs = await getContainerLogs(containerName, {
        tail,
        since,
        timestamps: true,
      });
      source = "docker";
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
  });
}
