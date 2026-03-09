import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
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
    type?: "universe" | "world-config";
  }>;
  nextSlotNumber: number;
  activeWorldName?: string;
  activeWorldType?: "universe" | "world-config";
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

export const POST = withErrorTracking(
  "/api/worlds/slots/[id]/activate",
  async (_request, ctx) => {
    const { id } = await ctx!.params;
    const metadata = await loadMetadata();

    // Find the slot
    const slot = metadata.slots.find((s) => s.id === id);
    if (!slot) {
      return NextResponse.json({ error: "Slot not found" }, { status: 404 });
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

    const slotType = slot.type ?? "universe";
    let autoSavedSlotId: string | undefined;

    if (slotType === "world-config") {
      // World-config activation: only replace universe/worlds/default/
      const worldDefaultPath = path.join(universePath, "worlds", "default");

      // Step 1: Auto-save current world directory (if it exists and has content)
      try {
        await fs.access(worldDefaultPath);
        const worldEntries = await fs.readdir(worldDefaultPath);

        if (worldEntries.length > 0) {
          const autoSlotNumber = metadata.nextSlotNumber;
          const autoSlotId = `slot-${autoSlotNumber}`;
          const autoSlotPath = path.join(slotsPath, autoSlotId);
          const autoSlotWorldDir = path.join(
            autoSlotPath,
            "worlds",
            "default",
          );

          await copyDirectory(worldDefaultPath, autoSlotWorldDir);

          metadata.slots.push({
            id: autoSlotId,
            name: `${metadata.activeWorldName ?? "World"} (Auto-saved)`,
            created: new Date().toISOString(),
            autoSaved: true,
            type: metadata.activeWorldType ?? "world-config",
          });
          metadata.nextSlotNumber = autoSlotNumber + 1;
          autoSavedSlotId = autoSlotId;
        }
      } catch {
        // World directory doesn't exist, skip auto-save
      }

      // Step 2: Clear and recreate universe/worlds/default/
      try {
        await fs.rm(worldDefaultPath, { recursive: true, force: true });
      } catch {
        // Ignore if doesn't exist
      }
      await fs.mkdir(worldDefaultPath, { recursive: true });

      // Step 3: Copy config.json from slot to universe/worlds/default/
      const slotWorldDir = path.join(slotPath, "worlds", "default");
      await copyDirectory(slotWorldDir, worldDefaultPath);
    } else {
      // Universe activation: replace entire universe (original behavior)

      // Step 1: Save current universe to a new auto-save slot
      try {
        await fs.access(universePath);
        const universeEntries = await fs.readdir(universePath);

        if (universeEntries.length > 0) {
          const autoSlotNumber = metadata.nextSlotNumber;
          const autoSlotId = `slot-${autoSlotNumber}`;
          const autoSlotPath = path.join(slotsPath, autoSlotId);

          await copyDirectory(universePath, autoSlotPath);

          metadata.slots.push({
            id: autoSlotId,
            name: `${metadata.activeWorldName ?? "Universe"} (Auto-saved)`,
            created: new Date().toISOString(),
            autoSaved: true,
            type: metadata.activeWorldType ?? "universe",
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
    }

    // Step 4: Delete the activated slot folder
    await fs.rm(slotPath, { recursive: true, force: true });

    // Step 5: Remove slot from metadata and track active world name
    metadata.slots = metadata.slots.filter((s) => s.id !== id);
    metadata.activeWorldName = slot.name;
    metadata.activeWorldType = slotType;
    await saveMetadata(metadata);

    const response = activateResponseSchema.parse({
      success: true,
      message: `Successfully activated ${slot.name}`,
      autoSavedSlotId,
    });

    return NextResponse.json(response);
  },
);
