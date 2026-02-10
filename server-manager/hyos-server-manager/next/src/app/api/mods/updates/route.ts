import { NextResponse } from "next/server";
import path from "node:path";
import { loadRegistry } from "@/lib/services/mods/mod-registry";
import { getProvider } from "@/lib/services/mods/browser/providers";
import type { ModProvider } from "@/lib/services/mods/browser/types";
import { loadProviderConfig } from "@/lib/services/mods/providers.loader";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

export async function GET() {
  try {
    const modsPath = getModsPath();
    const registry = await loadRegistry(modsPath);
    const providerConfig = await loadProviderConfig();

    const entries = Object.entries(registry);
    if (entries.length === 0) {
      return NextResponse.json({ updates: [], checkedAt: new Date().toISOString() });
    }

    const results = await Promise.allSettled(
      entries.map(async ([fileName, entry]) => {
        const provider = entry.provider as ModProvider;
        const config = providerConfig[provider];
        if (!config?.enabled) return null;

        const adapter = getProvider(provider);
        adapter.setApiKey(config.apiKey);

        if (!adapter.isConfigured()) return null;

        const versions = await adapter.getModVersions(entry.providerModId);
        if (versions.length === 0) return null;

        const latest = versions[0];
        if (!latest || latest.fileId === entry.fileId) return null;

        const currentMajor = parseInt(entry.installedVersion.split(".")[0] ?? "0", 10);
        const latestMajor = parseInt(latest.displayName.split(".")[0] ?? "0", 10);
        const isCritical =
          latest.releaseType === "release" &&
          !Number.isNaN(latestMajor) &&
          !Number.isNaN(currentMajor) &&
          latestMajor > currentMajor;

        return {
          fileName,
          currentVersion: entry.installedVersion,
          latestVersion: latest.displayName,
          latestFileId: latest.fileId,
          provider: entry.provider,
          isCritical,
        };
      }),
    );

    const updates: {
      fileName: string;
      currentVersion: string;
      latestVersion: string;
      latestFileId: string;
      provider: string;
      isCritical: boolean;
    }[] = [];

    for (const result of results) {
      if (result.status === "fulfilled" && result.value != null) {
        updates.push(result.value);
      }
    }

    return NextResponse.json({
      updates,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[mods/updates] Error checking updates:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to check updates",
      },
      { status: 500 },
    );
  }
}
