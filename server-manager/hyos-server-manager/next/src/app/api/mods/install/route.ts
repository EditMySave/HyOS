import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/services/mods/browser/providers";
import type { ModProvider, ModVersion } from "@/lib/services/mods/browser/types";
import { modVersionSchema } from "@/lib/services/mods/browser/types";
import { getNexusModFiles } from "@/lib/services/mods/browser/providers/nexusmods.service";
import { loadProviderConfig } from "@/lib/services/mods/providers.loader";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

const installBodySchema = z.object({
  provider: z.enum(["curseforge", "modtale", "nexusmods"]),
  version: modVersionSchema,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = installBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { provider, version } = parsed.data;
    const providerConfig = await loadProviderConfig();
    const providerApiKey = providerConfig[provider as ModProvider].apiKey;

    const adapter = getProvider(provider as ModProvider);
    adapter.setApiKey(providerApiKey);

    if (!adapter.isConfigured()) {
      return NextResponse.json(
        { error: `${provider} API key not configured` },
        { status: 400 },
      );
    }

    let resolvedVersion = version;
    if (
      provider === "nexusmods" &&
      providerApiKey &&
      version.fileId.endsWith("-0")
    ) {
      const modId = Number.parseInt(version.fileId.split("-")[0] ?? "0", 10);
      const files = await getNexusModFiles(providerApiKey, modId);
      if (files.length === 0) {
        return NextResponse.json(
          { error: "No files available for this mod" },
          { status: 400 },
        );
      }
      const file = files[0];
      resolvedVersion = {
        fileId: `${modId}-${file.file_id}`,
        fileName: file.file_name,
        displayName: file.name,
        downloadUrl: null,
        gameVersions: [file.mod_version],
        releaseType: file.category_name === "MAIN" ? "release" : "beta",
        fileSize: file.size_kb * 1024,
      } satisfies ModVersion;
    }

    const { fileName, data } = await adapter.downloadMod(resolvedVersion);

    const safeFileName = path.basename(fileName).endsWith(".jar")
      ? path.basename(fileName)
      : `${path.basename(fileName, path.extname(fileName))}.jar`;

    const modsPath = getModsPath();
    await fs.mkdir(modsPath, { recursive: true });
    const filePath = path.join(modsPath, safeFileName);
    await fs.writeFile(filePath, data);

    return NextResponse.json({
      success: true,
      message: `Installed ${safeFileName}`,
    });
  } catch (error) {
    console.error("[mods/install] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Install failed",
      },
      { status: 500 },
    );
  }
}
