import { NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

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

const renameSlotRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const parsed = renameSlotRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const { name } = parsed.data;
    const metadata = await loadMetadata();

    // Find the slot
    const slot = metadata.slots.find((s) => s.id === id);
    if (!slot) {
      return NextResponse.json(
        { error: "Slot not found" },
        { status: 404 },
      );
    }

    // Update the slot name
    slot.name = name;
    await saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      message: `Successfully renamed to ${name}`,
      slot,
    });
  } catch (error) {
    console.error("[worlds/slots] Error renaming slot:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to rename slot",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
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

    // Delete slot folder
    try {
      await fs.rm(slotPath, { recursive: true, force: true });
    } catch (error) {
      // Log but continue - might not exist
      console.warn(`[worlds/slots] Could not delete slot folder: ${error}`);
    }

    // Remove slot from metadata
    metadata.slots = metadata.slots.filter((s) => s.id !== id);
    await saveMetadata(metadata);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${slot.name}`,
    });
  } catch (error) {
    console.error("[worlds/slots] Error deleting slot:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to delete slot",
      },
      { status: 500 },
    );
  }
}
