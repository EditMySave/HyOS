import path from "node:path";
import { NextResponse } from "next/server";
import { getProvider } from "@/lib/services/mods/browser/providers";
import type {
  ModProvider,
  ModVersion,
} from "@/lib/services/mods/browser/types";
import { loadRegistry } from "@/lib/services/mods/mod-registry";
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
      return NextResponse.json({
        updates: [],
        checkedAt: new Date().toISOString(),
      });
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

        // Prefer the latest stable release; fall back to newest file
        const latestStable = versions.find((v) => v.releaseType === "release");
        const latest = latestStable ?? versions[0];
        if (!latest) return null;

        // Skip if the installed fileId matches the latest
        if (entry.fileId && latest.fileId === entry.fileId) return null;

        // Skip if the installed fileId matches ANY version at or above latest
        // (handles case where installed file is the same release under a different id)
        if (entry.fileId && versions.some((v) => v.fileId === entry.fileId)) {
          const installedIdx = versions.findIndex(
            (v) => v.fileId === entry.fileId,
          );
          const latestIdx = versions.indexOf(latest);
          // versions are newest-first, so lower index = newer
          if (installedIdx <= latestIdx) return null;
        }

        // If no fileId stored, compare version strings to avoid false positives
        if (!entry.fileId) {
          const installed = entry.installedVersion.toLowerCase();
          const latestName = latest.displayName.toLowerCase();
          const latestFile = latest.fileName
            .toLowerCase()
            .replace(/\.jar$/, "");
          if (
            latestName === installed ||
            latestFile === installed ||
            latestName.includes(installed) ||
            latestFile.includes(installed)
          )
            return null;
        }

        const currentMajor = parseInt(
          entry.installedVersion.split(".")[0] ?? "0",
          10,
        );
        const latestMajor = parseInt(
          latest.displayName.split(".")[0] ?? "0",
          10,
        );
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
          providerModId: entry.providerModId,
          latestModVersion: latest,
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
      providerModId: string;
      latestModVersion: ModVersion;
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
        error:
          error instanceof Error ? error.message : "Failed to check updates",
      },
      { status: 500 },
    );
  }
}
