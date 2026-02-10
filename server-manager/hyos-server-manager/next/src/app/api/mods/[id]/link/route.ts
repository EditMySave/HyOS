import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getProvider } from "@/lib/services/mods/browser/providers";
import { inspectJar } from "@/lib/services/mods/jar-inspector";
import { registerMod } from "@/lib/services/mods/mod-registry";
import { loadProviderConfig } from "@/lib/services/mods/providers.loader";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

const linkBodySchema = z.object({
  provider: z.enum(["curseforge", "modtale", "nexusmods"]),
  providerModId: z.string(),
  websiteUrl: z.string(),
  iconUrl: z.string().nullable(),
  authors: z.array(z.string()),
  summary: z.string(),
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();

    const parsed = linkBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { provider, providerModId, websiteUrl, iconUrl, authors, summary } =
      parsed.data;

    const modsPath = getModsPath();
    const safeId = path.basename(id);
    const fileName = `${safeId}.jar`;
    const filePath = path.join(modsPath, fileName);

    // Verify the JAR exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }

    // Inspect JAR for manifest version
    let manifestVersion = "";
    try {
      const inspection = inspectJar(filePath);
      manifestVersion = inspection.manifestInfo?.version ?? "";
    } catch (e) {
      console.error(`[mods/link] Error inspecting ${fileName}:`, e);
    }

    // Load provider config and get adapter
    const providerConfig = await loadProviderConfig();
    const config = providerConfig[provider];
    const adapter = getProvider(provider);
    if (config) {
      adapter.setApiKey(config.apiKey);
    }

    // Fetch versions and try to match installed version
    let fileId = "";
    try {
      const versions = await adapter.getModVersions(providerModId);
      if (manifestVersion) {
        // Try exact match on displayName first, then check if version appears
        // in displayName or fileName (CurseForge uses filenames as displayName)
        const match =
          versions.find((v) => v.displayName === manifestVersion) ??
          versions.find(
            (v) =>
              v.displayName.includes(manifestVersion) ||
              v.fileName.includes(manifestVersion),
          );
        if (match) {
          fileId = match.fileId;
        }
      }
    } catch (e) {
      console.error(`[mods/link] Error fetching versions:`, e);
    }

    // Register the mod in the registry
    await registerMod(modsPath, fileName, {
      provider,
      providerModId,
      fileId,
      installedVersion: manifestVersion,
      authors,
      summary,
      iconUrl,
      websiteUrl,
      installedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `Linked ${fileName} to ${provider}`,
    });
  } catch (error) {
    console.error("[mods/link] Error linking mod:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to link mod",
      },
      { status: 500 },
    );
  }
}
