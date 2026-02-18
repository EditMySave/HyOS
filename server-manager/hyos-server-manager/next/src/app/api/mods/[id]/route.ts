import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { unregisterMod } from "@/lib/services/mods/mod-registry";

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
 * Delete a mod JAR file
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const modsPath = getModsPath();

    // Construct filename from ID (add .jar extension)
    // Sanitize the ID to prevent directory traversal
    const safeId = path.basename(id);
    const fileName = `${safeId}.jar`;
    const filePath = path.join(modsPath, fileName);

    // Verify the file exists
    try {
      await fs.access(filePath);
    } catch {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }

    // Verify it's a file (not a directory)
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      return NextResponse.json({ error: "Invalid mod path" }, { status: 400 });
    }

    // Delete the file
    await fs.unlink(filePath);

    // Clean up registry entry
    try {
      await unregisterMod(modsPath, fileName);
    } catch (e) {
      console.error("[mods/delete] Failed to update registry:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Deleted ${fileName}`,
    });
  } catch (error) {
    console.error("[mods/delete] Error deleting mod:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete mod",
      },
      { status: 500 },
    );
  }
}
