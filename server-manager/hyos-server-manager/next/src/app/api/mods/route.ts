import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { inspectJar } from "@/lib/services/mods/jar-inspector";
import { loadRegistry } from "@/lib/services/mods/mod-registry";

function getModsPath(): string {
  // Use HYTALE_STATE_DIR to derive base path, default to /data in containers
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    // State dir is typically /data/.state, so base is /data
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  // Fallback for local development
  return "/tmp/hytale-data/mods";
}

function getStateDir(): string {
  return process.env.HYTALE_STATE_DIR ?? "/tmp/hytale-data/.state";
}

/** Build a Set of filenames that were auto-disabled due to crashes */
async function getCrashedModFiles(stateDir: string): Promise<Set<string>> {
  const crashed = new Set<string>();

  // Check .broken-mods file (version:filename lines)
  try {
    const brokenPath = path.join(stateDir, ".broken-mods");
    const content = await fs.readFile(brokenPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Format is "version:filename" — extract filename
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx !== -1) {
        crashed.add(trimmed.slice(colonIdx + 1));
      } else {
        crashed.add(trimmed);
      }
    }
  } catch {
    // File may not exist
  }

  // Check mods.json failed array
  try {
    const modsJsonPath = path.join(stateDir, "mods.json");
    const content = await fs.readFile(modsJsonPath, "utf-8");
    const data = JSON.parse(content);
    if (Array.isArray(data.failed)) {
      for (const entry of data.failed) {
        if (entry.file) crashed.add(entry.file);
      }
    }
  } catch {
    // File may not exist
  }

  return crashed;
}

/** Raw build-version pattern: YYYY.MM.DD-hexhash */
const BUILD_VERSION_PATTERN = /^\d{4}\.\d{2}\.\d{2}-[0-9a-f]+$/;

/**
 * List all installed mod JAR files
 */
export async function GET() {
  try {
    const modsPath = getModsPath();

    // Check if mods folder exists
    try {
      await fs.access(modsPath);
    } catch {
      // Return empty list if folder doesn't exist
      return NextResponse.json({ mods: [], count: 0 });
    }

    // Read directory contents
    const entries = await fs.readdir(modsPath, { withFileTypes: true });

    // Load registry once for all mods
    const registry = await loadRegistry(modsPath);

    const mods = [];

    for (const entry of entries) {
      // Only process JAR files
      if (!entry.isFile() || !entry.name.endsWith(".jar")) {
        continue;
      }

      const filePath = path.join(modsPath, entry.name);
      const stats = await fs.stat(filePath);

      // Remove .jar extension for ID
      const id = entry.name.slice(0, -4);

      // Inspect JAR manifest for patch status
      let needsPatch = false;
      let isPatched = false;
      let manifestInfo:
        | {
            hasManifest: boolean;
            main: string | null;
            group: string | null;
            name: string | null;
            version: string | null;
            dependencies: string[];
            serverVersion: string | null;
          }
        | undefined;
      try {
        const inspection = inspectJar(filePath);
        needsPatch = inspection.needsPatch;
        isPatched = inspection.isPatched;
        manifestInfo = inspection.manifestInfo;
      } catch (e) {
        console.error(`[mods] Error inspecting ${entry.name}:`, e);
      }

      // Merge registry data
      const reg = registry[entry.name];

      mods.push({
        id,
        name: entry.name,
        fileName: entry.name,
        displayName: manifestInfo?.name ?? reg?.summary?.split(" ")[0] ?? id,
        description: reg?.summary ?? null,
        version: manifestInfo?.version ?? null,
        author: reg?.authors?.[0] ?? null,
        authors: reg?.authors ?? [],
        size: stats.size,
        modified: stats.mtime.toISOString(),
        path: filePath,
        needsPatch,
        isPatched,
        disabled: false,
        disableReason: null,
        manifestInfo,
        dependencies: manifestInfo?.dependencies ?? [],
        iconUrl: reg?.iconUrl ?? null,
        websiteUrl: reg?.websiteUrl ?? null,
        providerSource: reg?.provider ?? null,
      });
    }

    // Scan .disabled/ directory for disabled mods
    const disabledPath = path.join(modsPath, ".disabled");
    try {
      await fs.access(disabledPath);
      const disabledEntries = await fs.readdir(disabledPath, {
        withFileTypes: true,
      });
      const stateDir = getStateDir();
      const crashedFiles = await getCrashedModFiles(stateDir);

      for (const entry of disabledEntries) {
        if (!entry.isFile() || !entry.name.endsWith(".jar")) continue;

        const filePath = path.join(disabledPath, entry.name);
        const stats = await fs.stat(filePath);
        const id = entry.name.slice(0, -4);

        let needsPatch = false;
        let isPatched = false;
        let manifestInfo:
          | {
              hasManifest: boolean;
              main: string | null;
              group: string | null;
              name: string | null;
              version: string | null;
              dependencies: string[];
              serverVersion: string | null;
            }
          | undefined;
        try {
          const inspection = inspectJar(filePath);
          needsPatch = inspection.needsPatch;
          isPatched = inspection.isPatched;
          manifestInfo = inspection.manifestInfo;
        } catch (e) {
          console.error(`[mods] Error inspecting disabled ${entry.name}:`, e);
        }

        const reg = registry[entry.name];

        // Determine disable reason
        let disableReason: "crashed" | "invalid_version" | "manual" = "manual";
        if (crashedFiles.has(entry.name)) {
          disableReason = "crashed";
        } else if (
          manifestInfo?.serverVersion &&
          BUILD_VERSION_PATTERN.test(manifestInfo.serverVersion)
        ) {
          disableReason = "invalid_version";
        }

        mods.push({
          id,
          name: entry.name,
          fileName: entry.name,
          displayName:
            manifestInfo?.name ?? reg?.summary?.split(" ")[0] ?? id,
          description: reg?.summary ?? null,
          version: manifestInfo?.version ?? null,
          author: reg?.authors?.[0] ?? null,
          authors: reg?.authors ?? [],
          size: stats.size,
          modified: stats.mtime.toISOString(),
          path: filePath,
          needsPatch,
          isPatched,
          disabled: true,
          disableReason,
          manifestInfo,
          dependencies: manifestInfo?.dependencies ?? [],
          iconUrl: reg?.iconUrl ?? null,
          websiteUrl: reg?.websiteUrl ?? null,
          providerSource: reg?.provider ?? null,
        });
      }
    } catch {
      // .disabled/ directory doesn't exist — that's fine
    }

    // Sort by name
    mods.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json({
      mods,
      count: mods.length,
    });
  } catch (error) {
    console.error("[mods] Error listing mods:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list mods",
      },
      { status: 500 },
    );
  }
}
