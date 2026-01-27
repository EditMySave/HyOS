import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { activateResponseSchema } from "@/lib/services/worlds/worlds.types";

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
  return path.join(getBasePath(), "Server", "universe");
}

interface SlotMetadata {
  slots: Array<{
    id: string;
    name: string;
    created: string;
    sourceFile?: string;
    autoSaved?: boolean;
  }>;
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

async function copyDirectory(src: string, dest: string): Promise<void> {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const metadata = await loadMetadata();

    // Find the slot
    const slot = metadata.slots.find((s) => s.id === id);
    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 },
      );
    }

    const slotsPath = getSlotsPath();
    const slotPath = path.join(slotsPath, id);
    const universePath = getUniversePath();

    // Check if slot folder exists
    try {
      await fs.access(slotPath);
    } catch {
      return NextResponse.json(
        { error: "Slot folder does not exist" },
        { status: 404 },
      );
    }

    let autoSavedSlotId: string | undefined;

    // Step 1: Save current universe to a new auto-save slot (if universe exists and has content)
    try {
      await fs.access(universePath);
      const universeEntries = await fs.readdir(universePath);
      
      // Only create auto-save if universe has content
      if (universeEntries.length > 0) {
        const autoSlotNumber = metadata.nextSlotNumber;
        const autoSlotId = `slot-${autoSlotNumber}`;
        const autoSlotPath = path.join(slotsPath, autoSlotId);

        // Copy current universe to auto-save slot
        await copyDirectory(universePath, autoSlotPath);

        // Add auto-save slot to metadata
        metadata.slots.push({
          id: autoSlotId,
          name: `Slot ${autoSlotNumber} (Auto-saved)`,
          created: new Date().toISOString(),
          autoSaved: true,
        });
        metadata.nextSlotNumber = autoSlotNumber + 1;
        autoSavedSlotId = autoSlotId;
      }
    } catch {
      // Universe doesn't exist or is empty, skip auto-save
    }

    // Step 2: Clear active universe
    try {
      await fs.rm(universePath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }
    await fs.mkdir(universePath, { recursive: true });

    // Step 3: Copy slot contents to active universe
    await copyDirectory(slotPath, universePath);

    // Step 4: Delete the activated slot folder
    await fs.rm(slotPath, { recursive: true, force: true });

    // Step 5: Remove slot from metadata
    metadata.slots = metadata.slots.filter((s) => s.id !== id);
    await saveMetadata(metadata);

    const response = activateResponseSchema.parse({
      success: true,
      message: `Successfully activated ${slot.name}`,
      autoSavedSlotId,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error("[worlds/slots/activate] Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to activate slot",
      },
      { status: 500 },
    );
  }
}
