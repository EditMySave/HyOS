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
        manifestInfo,
        dependencies: manifestInfo?.dependencies ?? [],
        iconUrl: reg?.iconUrl ?? null,
        websiteUrl: reg?.websiteUrl ?? null,
        providerSource: reg?.provider ?? null,
      });
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
