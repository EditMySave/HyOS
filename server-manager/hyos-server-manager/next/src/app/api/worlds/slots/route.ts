import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import AdmZip from "adm-zip";
import {
  slotsResponseSchema,
  createSlotResponseSchema,
  type SlotInfo,
} from "@/lib/services/worlds/worlds.types";

function getBasePath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR;
  if (stateDir) {
    return path.dirname(stateDir);
  }
  return "/tmp/hytale-data";
}

function getSlotsPath(): string {
  return path.join(getBasePath(), "slots");
}

function getMetadataPath(): string {
  return path.join(getSlotsPath(), "metadata.json");
}

function getUniversePath(): string {
  return path.join(getBasePath(), "server", "universe");
}

interface SlotMetadata {
  slots: SlotInfo[];
  nextSlotNumber: number;
}

async function loadMetadata(): Promise<SlotMetadata> {
  const metadataPath = getMetadataPath();
  try {
    const data = await fs.readFile(metadataPath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { slots: [], nextSlotNumber: 1 };
  }
}

async function saveMetadata(metadata: SlotMetadata): Promise<void> {
  const metadataPath = getMetadataPath();
  await fs.mkdir(path.dirname(metadataPath), { recursive: true });
  await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
}

async function getSlotSize(slotPath: string): Promise<number> {
  let totalSize = 0;
  try {
    const entries = await fs.readdir(slotPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = path.join(slotPath, entry.name);
      if (entry.isDirectory()) {
        totalSize += await getSlotSize(entryPath);
      } else {
        const stats = await fs.stat(entryPath);
        totalSize += stats.size;
      }
    }
  } catch {
    // Ignore errors
  }
  return totalSize;
}

async function extractZip(
  zipPath: string,
  extractTo: string,
): Promise<{
  filesAdded: number;
  filesModified: number;
}> {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();

  const hasUniverseRoot = entries.some(
    (entry) =>
      entry.entryName === "universe/" ||
      entry.entryName.startsWith("universe/"),
  );

  const stripPrefix = hasUniverseRoot ? "universe/" : "";

  let filesAdded = 0;
  let filesModified = 0;

  try {
    await fs.rm(extractTo, { recursive: true, force: true });
  } catch {
    // Ignore if doesn't exist
  }

  await fs.mkdir(extractTo, { recursive: true });

  for (const entry of entries) {
    if (stripPrefix && !entry.entryName.startsWith(stripPrefix)) {
      continue;
    }

    const relativePath = stripPrefix
      ? entry.entryName.slice(stripPrefix.length)
      : entry.entryName;

    if (!relativePath) {
      continue;
    }

    if (entry.isDirectory) {
      const dirPath = path.join(extractTo, relativePath);
      await fs.mkdir(dirPath, { recursive: true });
      continue;
    }

    const filePath = path.join(extractTo, relativePath);
    const dirPath = path.dirname(filePath);

    await fs.mkdir(dirPath, { recursive: true });

    let exists = false;
    try {
      await fs.access(filePath);
      exists = true;
    } catch {
      // File doesn't exist
    }

    const data = entry.getData();
    await fs.writeFile(filePath, data);

    if (exists) {
      filesModified++;
    } else {
      filesAdded++;
    }
  }

  return { filesAdded, filesModified };
}

export async function GET() {
  try {
    const metadata = await loadMetadata();
    const slotsPath = getSlotsPath();

    const slotsWithSize: SlotInfo[] = [];

    for (const slot of metadata.slots) {
      const slotPath = path.join(slotsPath, slot.id);
      let size: number | undefined;
      try {
        size = await getSlotSize(slotPath);
      } catch {
        // Slot folder might not exist, skip size
      }

      slotsWithSize.push({
        ...slot,
        size,
      });
    }

    const response = slotsResponseSchema.parse({ slots: slotsWithSize });
    return NextResponse.json(response);
  } catch (error) {
    console.error("[worlds/slots] Error listing slots:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list slots",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.name.endsWith(".zip")) {
      return NextResponse.json(
        { error: "File must be a .zip file" },
        { status: 400 },
      );
    }

    const metadata = await loadMetadata();

    // Check slot limit (max 10 slots)
    if (metadata.slots.length >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 slots allowed. Please delete a slot first." },
        { status: 400 },
      );
    }

    // Generate next slot ID
    const slotNumber = metadata.nextSlotNumber;
    const slotId = `slot-${slotNumber}`;
    const slotName = `Slot ${slotNumber}`;

    const slotsPath = getSlotsPath();
    const slotPath = path.join(slotsPath, slotId);

    // Save uploaded file temporarily
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "hyos-upload-"));
    const tempZipPath = path.join(tempDir, file.name);
    const arrayBuffer = await file.arrayBuffer();
    await fs.writeFile(tempZipPath, Buffer.from(arrayBuffer));

    // Extract zip to slot folder
    const { filesAdded, filesModified } = await extractZip(
      tempZipPath,
      slotPath,
    );

    // Clean up temp file
    await fs.unlink(tempZipPath).catch(() => {});
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});

    // Add slot to metadata
    const newSlot: SlotInfo = {
      id: slotId,
      name: slotName,
      created: new Date().toISOString(),
      sourceFile: file.name,
      autoSaved: false,
    };

    metadata.slots.push(newSlot);
    metadata.nextSlotNumber = slotNumber + 1;
    await saveMetadata(metadata);

    const response = createSlotResponseSchema.parse({
      success: true,
      message: `Successfully created ${slotName}`,
      slotId,
      slotName,
      filesAdded,
      filesModified,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[worlds/slots] Error creating slot:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create slot",
      },
      { status: 500 },
    );
  }
}
