import { NextResponse } from "next/server";
import { getContainerLogs } from "@/lib/docker";
import { loadConfig } from "@/lib/services/config/config.loader";
import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Parse PluginManager log lines to determine which mod JARs are loaded.
 *
 * Relevant log patterns:
 *   [PluginManager] - Group:Name from path <filename>.jar
 *   [PluginManager] Enabled plugin Group:Name
 */
function parseLoadedMods(logs: string): {
  loadedFiles: Map<string, { group: string; name: string; enabled: boolean }>;
} {
  const loadedFiles = new Map<
    string,
    { group: string; name: string; enabled: boolean }
  >();

  // Track group:name → fileName mapping for "Enabled" lines
  const qualifiedToFile = new Map<string, string>();

  for (const line of logs.split("\n")) {
    // Match: [PluginManager] - Group:Name from path filename.jar
    const loadMatch = line.match(
      /\[PluginManager\]\s+-\s+(.+?):(.+?)\s+from path\s+(\S+)/,
    );
    if (loadMatch) {
      const group = loadMatch[1]!;
      const name = loadMatch[2]!;
      const fileName = loadMatch[3]!;
      loadedFiles.set(fileName, { group, name, enabled: false });
      qualifiedToFile.set(`${group}:${name}`, fileName);
      continue;
    }

    // Match: [PluginManager] Enabled plugin Group:Name
    const enabledMatch = line.match(
      /\[PluginManager\]\s+Enabled plugin\s+(.+?):(.+)/,
    );
    if (enabledMatch) {
      const qualified = `${enabledMatch[1]}:${enabledMatch[2]!.trim()}`;
      const fileName = qualifiedToFile.get(qualified);
      if (fileName) {
        const entry = loadedFiles.get(fileName);
        if (entry) {
          entry.enabled = true;
        }
      }
    }
  }

  return { loadedFiles };
}

/**
 * Read the latest Hytale log file
 */
async function readLatestLog(stateDir: string): Promise<string | null> {
  const dataDir = path.dirname(stateDir);
  const logDir = path.join(dataDir, "Server", "logs");

  try {
    const files = await fs.readdir(logDir);
    const logFiles = files
      .filter((f) => f.endsWith("_server.log"))
      .sort()
      .reverse();

    if (logFiles.length === 0) return null;
    return await fs.readFile(path.join(logDir, logFiles[0]!), "utf8");
  } catch {
    return null;
  }
}

/**
 * Get loaded plugins by parsing server logs for PluginManager entries.
 * Returns which JAR files were loaded and their enabled status.
 */
export async function GET() {
  try {
    const config = await loadConfig();
    const containerName = config.containerName || "hyos-server";
    const stateDir = config.stateDir || "/data/.state";

    let logs: string | null = null;

    // Try log files first
    logs = await readLatestLog(stateDir);

    // Fall back to Docker container logs
    if (!logs) {
      try {
        logs = await getContainerLogs(containerName, {
          tail: 500,
          timestamps: false,
        });
      } catch {
        // Docker not available
      }
    }

    if (!logs) {
      return NextResponse.json({ count: 0, plugins: [] });
    }

    const { loadedFiles } = parseLoadedMods(logs);

    // Build response matching LoadedPluginsResponse shape
    const plugins = Array.from(loadedFiles.entries()).map(
      ([fileName, info]) => ({
        name: info.name,
        version: "",
        description: "",
        state: info.enabled ? ("ENABLED" as const) : ("LOADING" as const),
        authors: [],
        fileName,
        group: info.group,
      }),
    );

    return NextResponse.json({
      count: plugins.length,
      plugins,
    });
  } catch (error) {
    console.error("[mods/loaded] Error parsing loaded plugins:", error);
    return NextResponse.json({ count: 0, plugins: [] });
  }
}
