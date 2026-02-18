import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { inspectJar, patchJar } from "@/lib/services/mods/jar-inspector";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Patch a content-only mod JAR by injecting a stub Main class
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const modsPath = getModsPath();

    const safeId = path.basename(id);
    const fileName = `${safeId}.jar`;
    const filePath = path.join(modsPath, fileName);

    // Verify the file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }

    // Check current state
    const inspection = inspectJar(filePath);
    if (inspection.isPatched) {
      return NextResponse.json({
        success: true,
        message: `${fileName} is already patched`,
      });
    }
    if (!inspection.needsPatch) {
      return NextResponse.json(
        { error: `${fileName} does not need patching` },
        { status: 400 },
      );
    }

    // Patch the JAR
    patchJar(filePath);

    // Verify patch succeeded
    const verify = inspectJar(filePath);
    if (!verify.isPatched) {
      return NextResponse.json(
        { error: "Patch verification failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: `Patched ${fileName} with stub Main class`,
    });
  } catch (error) {
    console.error("[mods/patch] Error patching mod:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to patch mod",
      },
      { status: 500 },
    );
  }
}
