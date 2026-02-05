import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { InstalledMod } from "@/lib/services/mods/mods.types";
import { inspectJar } from "@/lib/services/mods/jar-inspector";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

// Maximum file size: 100MB
const MAX_FILE_SIZE = 100 * 1024 * 1024;

/**
 * Upload a mod JAR file
 */
export async function POST(request: Request) {
  try {
    const modsPath = getModsPath();

    // Ensure mods directory exists
    await fs.mkdir(modsPath, { recursive: true });

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!file.name.endsWith(".jar")) {
      return NextResponse.json(
        { error: "Only JAR files are allowed" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Sanitize filename (remove path components, keep only basename)
    const safeFileName = path.basename(file.name);
    const filePath = path.join(modsPath, safeFileName);

    // Check if file already exists
    let alreadyExists = false;
    try {
      await fs.access(filePath);
      alreadyExists = true;
    } catch {
      // File doesn't exist, which is fine
    }

    // Convert File to Buffer and write to disk
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Get file stats
    const stats = await fs.stat(filePath);
    const id = safeFileName.slice(0, -4); // Remove .jar extension

    // Inspect JAR manifest for patch status
    let needsPatch = false;
    let isPatched = false;
    let manifestInfo: InstalledMod["manifestInfo"];
    try {
      const inspection = inspectJar(filePath);
      needsPatch = inspection.needsPatch;
      isPatched = inspection.isPatched;
      manifestInfo = inspection.manifestInfo;
    } catch (e) {
      console.error(`[mods/upload] Error inspecting ${safeFileName}:`, e);
    }

    const mod: InstalledMod = {
      id,
      name: safeFileName,
      fileName: safeFileName,
      size: stats.size,
      modified: stats.mtime.toISOString(),
      path: filePath,
      needsPatch,
      isPatched,
      manifestInfo,
    };

    return NextResponse.json({
      success: true,
      message: alreadyExists
        ? `Updated ${safeFileName}`
        : `Installed ${safeFileName}`,
      mod,
    });
  } catch (error) {
    console.error("[mods/upload] Error uploading mod:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to upload mod",
      },
      { status: 500 },
    );
  }
}
