import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import type { FileInfo } from "@/lib/services/worlds/worlds.types";

function getUniversePath(): string {
  // Use HYTALE_STATE_DIR to derive base path, default to /data in containers
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    // State dir is typically /data/.state, so base is /data
    const baseDir = path.dirname(stateDir);
    return path.join(baseDir, "Server", "universe");
  }
  // Fallback for local development
  return "/tmp/hytale-data/Server/universe";
}

async function getFileInfo(
  filePath: string,
  basePath: string,
): Promise<FileInfo> {
  const stats = await fs.stat(filePath);
  const relativePath = path.relative(basePath, filePath);
  const name = path.basename(filePath);

  if (stats.isDirectory()) {
    const children: FileInfo[] = [];
    try {
      const entries = await fs.readdir(filePath);
      for (const entry of entries) {
        const entryPath = path.join(filePath, entry);
        try {
          const childInfo = await getFileInfo(entryPath, basePath);
          children.push(childInfo);
        } catch {
          // Skip files we can't read
        }
      }
    } catch {
      // Skip directories we can't read
    }

    return {
      name,
      path: relativePath,
      type: "directory",
      modified: stats.mtime.toISOString(),
      children: children.sort((a, b) => {
        // Directories first, then files, then alphabetical
        if (a.type !== b.type) {
          return a.type === "directory" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      }),
    };
  }

  return {
    name,
    path: relativePath,
    type: "file",
    size: stats.size,
    modified: stats.mtime.toISOString(),
  };
}

export async function GET() {
  try {
    const universePath = getUniversePath();

    // Check if universe folder exists
    try {
      await fs.access(universePath);
    } catch {
      return NextResponse.json({ files: [] });
    }

    const files = await getFileInfo(universePath, universePath);

    return NextResponse.json({
      files: files.children || [],
    });
  } catch (error) {
    console.error("[worlds/files] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list files",
      },
      { status: 500 },
    );
  }
}
