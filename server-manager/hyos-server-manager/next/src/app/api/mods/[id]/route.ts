import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { unregisterMod } from "@/lib/services/mods/mod-registry";

function getModsPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "mods");
  }
  return "/tmp/hytale-data/mods";
}

/**
 * Delete a mod JAR file
 */
export const DELETE = withErrorTracking("/api/mods/[id]", async (_request, ctx) => {
  const { id } = await ctx!.params;
  const modsPath = getModsPath();

  // Construct filename from ID (add .jar extension)
  // Sanitize the ID to prevent directory traversal
  const safeId = path.basename(id);
  const fileName = `${safeId}.jar`;
  let filePath = path.join(modsPath, fileName);

  // Verify the file exists — check mods/ then .disabled/
  try {
    await fs.access(filePath);
  } catch {
    // Fall back to .disabled/ directory
    const disabledPath = path.join(modsPath, ".disabled", fileName);
    try {
      await fs.access(disabledPath);
      filePath = disabledPath;
    } catch {
      return NextResponse.json({ error: "Mod not found" }, { status: 404 });
    }
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
});
