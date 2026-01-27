import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import fsSync from "node:fs";
import path from "node:path";
import archiver from "archiver";

function getBasePath(): string {
  // Use HYTALE_STATE_DIR to derive base path, default to /data in containers
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    // State dir is typically /data/.state, so base is /data
    return path.dirname(stateDir);
  }
  // Fallback for local development
  return "/tmp/hytale-data";
}

function getUniversePath(): string {
  return path.join(getBasePath(), "Server", "universe");
}

function getBackupsPath(): string {
  return path.join(getBasePath(), "backups", "universe");
}

export async function GET() {
  try {
    const backupsPath = getBackupsPath();

    // Check if backups directory exists
    try {
      await fs.access(backupsPath);
    } catch {
      return NextResponse.json({ backups: [] });
    }

    const files = await fs.readdir(backupsPath);
    const backups = [];

    for (const file of files) {
      if (!file.endsWith(".zip")) continue;

      const filePath = path.join(backupsPath, file);
      const stats = await fs.stat(filePath);

      backups.push({
        name: file,
        path: filePath,
        size: stats.size,
        created: stats.birthtime.toISOString(),
      });
    }

    // Sort by creation date, newest first
    backups.sort((a, b) => {
      return new Date(b.created).getTime() - new Date(a.created).getTime();
    });

    return NextResponse.json({ backups });
  } catch (error) {
    console.error("[worlds/backup] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to list backups",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  try {
    const universePath = getUniversePath();
    const backupsPath = getBackupsPath();

    // Check if universe folder exists
    try {
      await fs.access(universePath);
    } catch {
      return NextResponse.json(
        { error: "Universe folder does not exist" },
        { status: 404 },
      );
    }

    // Ensure backups directory exists
    await fs.mkdir(backupsPath, { recursive: true });

    // Create timestamped backup filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = path.join(backupsPath, `universe-${timestamp}.zip`);

    await new Promise<void>((resolve, reject) => {
      const output = fsSync.createWriteStream(backupPath);
      const archive = archiver("zip", { zlib: { level: 9 } });

      output.on("close", () => {
        resolve();
      });

      archive.on("error", (err) => {
        reject(err);
      });

      archive.pipe(output);

      // Add universe folder contents
      archive.directory(universePath, false);

      archive.finalize();
    });

    const stats = await fs.stat(backupPath);

    return NextResponse.json({
      success: true,
      message: "Backup created successfully",
      backupPath,
      size: stats.size,
    });
  } catch (error) {
    console.error("[worlds/backup] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create backup",
      },
      { status: 500 },
    );
  }
}
