import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/services/mods/browser/providers";
import type { ModProvider } from "@/lib/services/mods/browser/types";
import { modVersionSchema } from "@/lib/services/mods/browser/types";
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

    const { fileName, data } = await adapter.downloadMod(version);

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
