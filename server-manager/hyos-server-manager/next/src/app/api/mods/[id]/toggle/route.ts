import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

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
 * Toggle a mod between enabled (mods/) and disabled (mods/.disabled/)
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const enabled = Boolean(body.enabled);

    const modsPath = getModsPath();
    const disabledPath = path.join(modsPath, ".disabled");

    const safeId = path.basename(id);
    const fileName = `${safeId}.jar`;

    if (enabled) {
      // Move from .disabled/ back to mods/
      const srcPath = path.join(disabledPath, fileName);
      const destPath = path.join(modsPath, fileName);

      try {
        await fs.access(srcPath);
      } catch {
        return NextResponse.json(
          { error: "Disabled mod not found" },
          { status: 404 },
        );
      }

      // Check for collision in mods/
      try {
        await fs.access(destPath);
        return NextResponse.json(
          { error: `A mod named ${fileName} already exists in mods/` },
          { status: 409 },
        );
      } catch {
        // No collision — good
      }

      await fs.rename(srcPath, destPath);

      return NextResponse.json({
        success: true,
        message: `Enabled ${fileName}`,
      });
    }

    // Move from mods/ to .disabled/
    const srcPath = path.join(modsPath, fileName);
    const destPath = path.join(disabledPath, fileName);

    try {
      await fs.access(srcPath);
    } catch {
      return NextResponse.json(
        { error: "Mod not found" },
        { status: 404 },
      );
    }

    // Ensure .disabled/ exists
    await fs.mkdir(disabledPath, { recursive: true });

    // Check for collision in .disabled/
    try {
      await fs.access(destPath);
      return NextResponse.json(
        { error: `A mod named ${fileName} already exists in .disabled/` },
        { status: 409 },
      );
    } catch {
      // No collision — good
    }

    await fs.rename(srcPath, destPath);

    return NextResponse.json({
      success: true,
      message: `Disabled ${fileName}`,
    });
  } catch (error) {
    console.error("[mods/toggle] Error toggling mod:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to toggle mod",
      },
      { status: 500 },
    );
  }
}
