import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  createWorldConfigRequestSchema,
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

function getActiveConfigPath(): string {
  return path.join(
    getBasePath(),
    "Server",
    "universe",
    "worlds",
    "default",
    "config.json",
  );
}

interface SlotMetadata {
  slots: SlotInfo[];
  nextSlotNumber: number;
  activeWorldName?: string;
  activeWorldType?: string;
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

export async function GET() {
  try {
    const configPath = getActiveConfigPath();

    let config: Record<string, unknown>;
    try {
      const data = await fs.readFile(configPath, "utf-8");
      config = JSON.parse(data);
    } catch {
      return NextResponse.json(
        { error: "Active world config not found" },
        { status: 404 },
      );
    }

    const metadata = await loadMetadata();

    return NextResponse.json({
      config,
      slotName: metadata.activeWorldName ?? "Active World",
    });
  } catch (error) {
    console.error("[worlds/active/config] Error reading config:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to read config",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const parsed = createWorldConfigRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 },
      );
    }

    const config = parsed.data;
    const configPath = getActiveConfigPath();

    // Read existing config to preserve UUID and Version
    let existingConfig: Record<string, unknown> = {};
    try {
      const data = await fs.readFile(configPath, "utf-8");
      existingConfig = JSON.parse(data);
    } catch {
      // If file doesn't exist, we'll create fresh
    }

    const worldConfig = {
      Version: existingConfig.Version ?? 4,
      UUID: existingConfig.UUID ?? null,
      Seed: config.seed ?? Date.now(),
      WorldGen: {
        Type: config.worldGen?.type ?? "Hytale",
        Name: config.worldGen?.name ?? "Default",
      },
      WorldMap: {
        Type: config.worldMap?.type ?? "WorldGen",
      },
      ChunkStorage: {
        Type: config.chunkStorage?.type ?? "Hytale",
      },
      ChunkConfig: config.chunkConfig ?? {},
      IsTicking: config.isTicking ?? true,
      IsBlockTicking: config.isBlockTicking ?? true,
      IsPvpEnabled: config.isPvpEnabled ?? false,
      IsFallDamageEnabled: config.isFallDamageEnabled ?? true,
      IsGameTimePaused: config.isGameTimePaused ?? false,
      GameTime: config.gameTime ?? "0001-01-01T08:26:59.761606129Z",
      RequiredPlugins: config.requiredPlugins ?? {},
      IsSpawningNPC: config.isSpawningNPC ?? true,
      IsSpawnMarkersEnabled: config.isSpawnMarkersEnabled ?? true,
      IsAllNPCFrozen: config.isAllNPCFrozen ?? false,
      GameplayConfig: config.gameplayConfig ?? "Default",
      IsCompassUpdating: config.isCompassUpdating ?? true,
      IsSavingPlayers: config.isSavingPlayers ?? true,
      IsSavingChunks: config.isSavingChunks ?? true,
      IsUnloadingChunks: config.isUnloadingChunks ?? true,
      IsObjectiveMarkersEnabled: config.isObjectiveMarkersEnabled ?? true,
      DeleteOnUniverseStart: config.deleteOnUniverseStart ?? false,
      DeleteOnRemove: config.deleteOnRemove ?? false,
      ResourceStorage: {
        Type: config.resourceStorage?.type ?? "Hytale",
      },
      Plugin: config.plugin ?? {},
    };

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(worldConfig, null, 2));

    // Update activeWorldName in metadata if name changed
    const metadata = await loadMetadata();
    if (config.name && config.name !== metadata.activeWorldName) {
      metadata.activeWorldName = config.name;
      await saveMetadata(metadata);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully updated active world config`,
    });
  } catch (error) {
    console.error("[worlds/active/config] Error updating config:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update config",
      },
      { status: 500 },
    );
  }
}
