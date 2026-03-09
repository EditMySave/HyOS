"use client";

import { ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCreateWorldFromConfig } from "@/lib/services/worlds";

function ToggleField({
  id,
  label,
  description,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="space-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export default function CreateWorldPage() {
  const router = useRouter();
  const { trigger: createWorld, isMutating } = useCreateWorldFromConfig();

  // Basic
  const [name, setName] = useState("");
  const [seed, setSeed] = useState(Date.now());

  // World Generation
  const [worldGenType, setWorldGenType] = useState("Hytale");
  const [worldGenName, setWorldGenName] = useState("Default");
  const [worldMapType, setWorldMapType] = useState("WorldGen");

  // Storage
  const [chunkStorageType, setChunkStorageType] = useState("Hytale");
  const [resourceStorageType, setResourceStorageType] = useState("Hytale");
  const [chunkConfig, setChunkConfig] = useState("{}");

  // Gameplay
  const [isPvpEnabled, setIsPvpEnabled] = useState(false);
  const [isFallDamageEnabled, setIsFallDamageEnabled] = useState(true);
  const [isGameTimePaused, setIsGameTimePaused] = useState(false);
  const [gameTime, setGameTime] = useState(
    "0001-01-01T08:26:59.761606129Z",
  );
  const [gameplayConfig, setGameplayConfig] = useState("Default");

  // Entities
  const [isSpawningNPC, setIsSpawningNPC] = useState(true);
  const [isSpawnMarkersEnabled, setIsSpawnMarkersEnabled] = useState(true);
  const [isAllNPCFrozen, setIsAllNPCFrozen] = useState(false);

  // World Behavior
  const [isTicking, setIsTicking] = useState(true);
  const [isBlockTicking, setIsBlockTicking] = useState(true);
  const [isCompassUpdating, setIsCompassUpdating] = useState(true);
  const [isObjectiveMarkersEnabled, setIsObjectiveMarkersEnabled] =
    useState(true);

  // Persistence
  const [isSavingPlayers, setIsSavingPlayers] = useState(true);
  const [isSavingChunks, setIsSavingChunks] = useState(true);
  const [isUnloadingChunks, setIsUnloadingChunks] = useState(true);

  // Cleanup
  const [deleteOnUniverseStart, setDeleteOnUniverseStart] = useState(false);
  const [deleteOnRemove, setDeleteOnRemove] = useState(false);

  // Plugins
  const [requiredPlugins, setRequiredPlugins] = useState("{}");
  const [plugin, setPlugin] = useState("{}");

  const handleRegenerateSeed = useCallback(() => {
    setSeed(Date.now());
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;

    let parsedChunkConfig = {};
    let parsedRequiredPlugins = {};
    let parsedPlugin = {};

    try {
      parsedChunkConfig = JSON.parse(chunkConfig);
    } catch {
      alert("Invalid JSON in Chunk Config");
      return;
    }

    try {
      parsedRequiredPlugins = JSON.parse(requiredPlugins);
    } catch {
      alert("Invalid JSON in Required Plugins");
      return;
    }

    try {
      parsedPlugin = JSON.parse(plugin);
    } catch {
      alert("Invalid JSON in Plugin");
      return;
    }

    try {
      await createWorld({
        name: name.trim(),
        seed,
        worldGen: { type: worldGenType, name: worldGenName },
        worldMap: { type: worldMapType },
        chunkStorage: { type: chunkStorageType },
        chunkConfig: parsedChunkConfig,
        resourceStorage: { type: resourceStorageType },
        isTicking,
        isBlockTicking,
        isPvpEnabled,
        isFallDamageEnabled,
        isGameTimePaused,
        gameTime,
        gameplayConfig,
        isSpawningNPC,
        isSpawnMarkersEnabled,
        isAllNPCFrozen,
        isCompassUpdating,
        isSavingPlayers,
        isSavingChunks,
        isUnloadingChunks,
        isObjectiveMarkersEnabled,
        deleteOnUniverseStart,
        deleteOnRemove,
        requiredPlugins: parsedRequiredPlugins,
        plugin: parsedPlugin,
      });
      router.push("/worlds");
    } catch (error) {
      console.error("Create world failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to create world",
      );
    }
  }, [
    name,
    seed,
    worldGenType,
    worldGenName,
    worldMapType,
    chunkStorageType,
    resourceStorageType,
    chunkConfig,
    isTicking,
    isBlockTicking,
    isPvpEnabled,
    isFallDamageEnabled,
    isGameTimePaused,
    gameTime,
    gameplayConfig,
    isSpawningNPC,
    isSpawnMarkersEnabled,
    isAllNPCFrozen,
    isCompassUpdating,
    isSavingPlayers,
    isSavingChunks,
    isUnloadingChunks,
    isObjectiveMarkersEnabled,
    deleteOnUniverseStart,
    deleteOnRemove,
    requiredPlugins,
    plugin,
    createWorld,
    router,
  ]);

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/worlds">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-4xl font-bold text-foreground font-cablefied">
            Create New World
          </h1>
          <p className="text-muted-foreground">
            Configure a new world and save it as a slot
          </p>
        </div>
      </div>

      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Settings</CardTitle>
          <CardDescription>World name and seed configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="world-name">World Name</Label>
            <Input
              id="world-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My World"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <div className="flex gap-2">
              <Input
                id="seed"
                type="number"
                value={seed}
                onChange={(e) => setSeed(Number(e.target.value))}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateSeed}
                title="Regenerate seed"
              >
                <RefreshCw className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* World Generation */}
      <Card>
        <CardHeader>
          <CardTitle>World Generation</CardTitle>
          <CardDescription>
            How the world terrain and map are generated
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="worldgen-type">WorldGen Type</Label>
            <Input
              id="worldgen-type"
              type="text"
              value={worldGenType}
              onChange={(e) => setWorldGenType(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worldgen-name">WorldGen Name</Label>
            <Input
              id="worldgen-name"
              type="text"
              value={worldGenName}
              onChange={(e) => setWorldGenName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worldmap-type">WorldMap Type</Label>
            <Input
              id="worldmap-type"
              type="text"
              value={worldMapType}
              onChange={(e) => setWorldMapType(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Storage */}
      <Card>
        <CardHeader>
          <CardTitle>Storage</CardTitle>
          <CardDescription>Chunk and resource storage backends</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="chunk-storage">Chunk Storage Type</Label>
            <Input
              id="chunk-storage"
              type="text"
              value={chunkStorageType}
              onChange={(e) => setChunkStorageType(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-storage">Resource Storage Type</Label>
            <Input
              id="resource-storage"
              type="text"
              value={resourceStorageType}
              onChange={(e) => setResourceStorageType(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chunk-config">Chunk Config (JSON)</Label>
            <textarea
              id="chunk-config"
              value={chunkConfig}
              onChange={(e) => setChunkConfig(e.target.value)}
              className="flex min-h-[80px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Gameplay */}
      <Card>
        <CardHeader>
          <CardTitle>Gameplay</CardTitle>
          <CardDescription>
            Combat, damage, and game time settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleField
            id="pvp"
            label="PvP Enabled"
            description="Allow players to fight each other"
            checked={isPvpEnabled}
            onCheckedChange={setIsPvpEnabled}
          />
          <ToggleField
            id="fall-damage"
            label="Fall Damage Enabled"
            description="Players take damage from falling"
            checked={isFallDamageEnabled}
            onCheckedChange={setIsFallDamageEnabled}
          />
          <ToggleField
            id="game-time-paused"
            label="Game Time Paused"
            description="Freeze the in-game time progression"
            checked={isGameTimePaused}
            onCheckedChange={setIsGameTimePaused}
          />
          <div className="space-y-2 pt-2">
            <Label htmlFor="game-time">Game Time</Label>
            <Input
              id="game-time"
              type="text"
              value={gameTime}
              onChange={(e) => setGameTime(e.target.value)}
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="gameplay-config">Gameplay Config</Label>
            <Input
              id="gameplay-config"
              type="text"
              value={gameplayConfig}
              onChange={(e) => setGameplayConfig(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Entities */}
      <Card>
        <CardHeader>
          <CardTitle>Entities</CardTitle>
          <CardDescription>NPC spawning and behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleField
            id="spawning-npc"
            label="NPC Spawning"
            description="Allow NPCs to spawn naturally"
            checked={isSpawningNPC}
            onCheckedChange={setIsSpawningNPC}
          />
          <ToggleField
            id="spawn-markers"
            label="Spawn Markers Enabled"
            description="Use spawn marker points for NPC placement"
            checked={isSpawnMarkersEnabled}
            onCheckedChange={setIsSpawnMarkersEnabled}
          />
          <ToggleField
            id="all-npc-frozen"
            label="All NPCs Frozen"
            description="Freeze all NPC movement and AI"
            checked={isAllNPCFrozen}
            onCheckedChange={setIsAllNPCFrozen}
          />
        </CardContent>
      </Card>

      {/* World Behavior */}
      <Card>
        <CardHeader>
          <CardTitle>World Behavior</CardTitle>
          <CardDescription>Tick processing and world updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleField
            id="ticking"
            label="World Ticking"
            description="Process world tick updates"
            checked={isTicking}
            onCheckedChange={setIsTicking}
          />
          <ToggleField
            id="block-ticking"
            label="Block Ticking"
            description="Process block-level tick updates"
            checked={isBlockTicking}
            onCheckedChange={setIsBlockTicking}
          />
          <ToggleField
            id="compass"
            label="Compass Updating"
            description="Update compass direction for players"
            checked={isCompassUpdating}
            onCheckedChange={setIsCompassUpdating}
          />
          <ToggleField
            id="objective-markers"
            label="Objective Markers Enabled"
            description="Show objective markers in the world"
            checked={isObjectiveMarkersEnabled}
            onCheckedChange={setIsObjectiveMarkersEnabled}
          />
        </CardContent>
      </Card>

      {/* Persistence */}
      <Card>
        <CardHeader>
          <CardTitle>Persistence</CardTitle>
          <CardDescription>
            Auto-save and chunk management settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleField
            id="saving-players"
            label="Saving Players"
            description="Automatically save player data"
            checked={isSavingPlayers}
            onCheckedChange={setIsSavingPlayers}
          />
          <ToggleField
            id="saving-chunks"
            label="Saving Chunks"
            description="Automatically save chunk data"
            checked={isSavingChunks}
            onCheckedChange={setIsSavingChunks}
          />
          <ToggleField
            id="unloading-chunks"
            label="Unloading Chunks"
            description="Unload chunks when no players are nearby"
            checked={isUnloadingChunks}
            onCheckedChange={setIsUnloadingChunks}
          />
        </CardContent>
      </Card>

      {/* Cleanup */}
      <Card>
        <CardHeader>
          <CardTitle>Cleanup</CardTitle>
          <CardDescription>World deletion behavior</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <ToggleField
            id="delete-on-universe-start"
            label="Delete on Universe Start"
            description="Delete this world when the universe starts"
            checked={deleteOnUniverseStart}
            onCheckedChange={setDeleteOnUniverseStart}
          />
          <ToggleField
            id="delete-on-remove"
            label="Delete on Remove"
            description="Delete world data when the world is removed"
            checked={deleteOnRemove}
            onCheckedChange={setDeleteOnRemove}
          />
        </CardContent>
      </Card>

      {/* Plugins */}
      <Card>
        <CardHeader>
          <CardTitle>Plugins</CardTitle>
          <CardDescription>Plugin requirements and configuration</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="required-plugins">Required Plugins (JSON)</Label>
            <textarea
              id="required-plugins"
              value={requiredPlugins}
              onChange={(e) => setRequiredPlugins(e.target.value)}
              className="flex min-h-[80px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plugin-config">Plugin Config (JSON)</Label>
            <textarea
              id="plugin-config"
              value={plugin}
              onChange={(e) => setPlugin(e.target.value)}
              className="flex min-h-[80px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" asChild>
          <Link href="/worlds">Cancel</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={isMutating || !name.trim() || name.trim().length > 100}
        >
          {isMutating ? "Creating..." : "Create World"}
        </Button>
      </div>
    </div>
  );
}
