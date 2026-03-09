import { RefreshCw } from "lucide-react";
import { useCallback } from "react";
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

export interface WorldConfigFormValues {
  name: string;
  seed: number;
  worldGenType: string;
  worldGenName: string;
  worldMapType: string;
  chunkStorageType: string;
  resourceStorageType: string;
  chunkConfig: string;
  isPvpEnabled: boolean;
  isFallDamageEnabled: boolean;
  isGameTimePaused: boolean;
  gameTime: string;
  gameplayConfig: string;
  isSpawningNPC: boolean;
  isSpawnMarkersEnabled: boolean;
  isAllNPCFrozen: boolean;
  isTicking: boolean;
  isBlockTicking: boolean;
  isCompassUpdating: boolean;
  isObjectiveMarkersEnabled: boolean;
  isSavingPlayers: boolean;
  isSavingChunks: boolean;
  isUnloadingChunks: boolean;
  deleteOnUniverseStart: boolean;
  deleteOnRemove: boolean;
  requiredPlugins: string;
  plugin: string;
}

export function getDefaultFormValues(): WorldConfigFormValues {
  return {
    name: "",
    seed: Date.now(),
    worldGenType: "Hytale",
    worldGenName: "Default",
    worldMapType: "WorldGen",
    chunkStorageType: "Hytale",
    resourceStorageType: "Hytale",
    chunkConfig: "{}",
    isPvpEnabled: false,
    isFallDamageEnabled: true,
    isGameTimePaused: false,
    gameTime: "0001-01-01T08:26:59.761606129Z",
    gameplayConfig: "Default",
    isSpawningNPC: true,
    isSpawnMarkersEnabled: true,
    isAllNPCFrozen: false,
    isTicking: true,
    isBlockTicking: true,
    isCompassUpdating: true,
    isObjectiveMarkersEnabled: true,
    isSavingPlayers: true,
    isSavingChunks: true,
    isUnloadingChunks: true,
    deleteOnUniverseStart: false,
    deleteOnRemove: false,
    requiredPlugins: "{}",
    plugin: "{}",
  };
}

export function configToFormValues(
  config: Record<string, unknown>,
  slotName: string,
): WorldConfigFormValues {
  return {
    name: slotName,
    seed: (config.Seed as number) ?? Date.now(),
    worldGenType:
      (config.WorldGen as Record<string, string>)?.Type ?? "Hytale",
    worldGenName:
      (config.WorldGen as Record<string, string>)?.Name ?? "Default",
    worldMapType:
      (config.WorldMap as Record<string, string>)?.Type ?? "WorldGen",
    chunkStorageType:
      (config.ChunkStorage as Record<string, string>)?.Type ?? "Hytale",
    resourceStorageType:
      (config.ResourceStorage as Record<string, string>)?.Type ?? "Hytale",
    chunkConfig: JSON.stringify(config.ChunkConfig ?? {}, null, 2),
    isPvpEnabled: (config.IsPvpEnabled as boolean) ?? false,
    isFallDamageEnabled: (config.IsFallDamageEnabled as boolean) ?? true,
    isGameTimePaused: (config.IsGameTimePaused as boolean) ?? false,
    gameTime:
      (config.GameTime as string) ?? "0001-01-01T08:26:59.761606129Z",
    gameplayConfig: (config.GameplayConfig as string) ?? "Default",
    isSpawningNPC: (config.IsSpawningNPC as boolean) ?? true,
    isSpawnMarkersEnabled: (config.IsSpawnMarkersEnabled as boolean) ?? true,
    isAllNPCFrozen: (config.IsAllNPCFrozen as boolean) ?? false,
    isTicking: (config.IsTicking as boolean) ?? true,
    isBlockTicking: (config.IsBlockTicking as boolean) ?? true,
    isCompassUpdating: (config.IsCompassUpdating as boolean) ?? true,
    isObjectiveMarkersEnabled:
      (config.IsObjectiveMarkersEnabled as boolean) ?? true,
    isSavingPlayers: (config.IsSavingPlayers as boolean) ?? true,
    isSavingChunks: (config.IsSavingChunks as boolean) ?? true,
    isUnloadingChunks: (config.IsUnloadingChunks as boolean) ?? true,
    deleteOnUniverseStart:
      (config.DeleteOnUniverseStart as boolean) ?? false,
    deleteOnRemove: (config.DeleteOnRemove as boolean) ?? false,
    requiredPlugins: JSON.stringify(config.RequiredPlugins ?? {}, null, 2),
    plugin: JSON.stringify(config.Plugin ?? {}, null, 2),
  };
}

interface WorldConfigFormProps {
  values: WorldConfigFormValues;
  onChange: (values: WorldConfigFormValues) => void;
  disabled?: boolean;
}

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

export function WorldConfigForm({
  values,
  onChange,
  disabled,
}: WorldConfigFormProps) {
  const update = useCallback(
    (patch: Partial<WorldConfigFormValues>) => {
      onChange({ ...values, ...patch });
    },
    [values, onChange],
  );

  const handleRegenerateSeed = useCallback(() => {
    update({ seed: Date.now() });
  }, [update]);

  return (
    <div className="space-y-6">
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
              value={values.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="My World"
              maxLength={100}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seed">Seed</Label>
            <div className="flex gap-2">
              <Input
                id="seed"
                type="number"
                value={values.seed}
                onChange={(e) => update({ seed: Number(e.target.value) })}
                className="flex-1"
                disabled={disabled}
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleRegenerateSeed}
                title="Regenerate seed"
                disabled={disabled}
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
              value={values.worldGenType}
              onChange={(e) => update({ worldGenType: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worldgen-name">WorldGen Name</Label>
            <Input
              id="worldgen-name"
              type="text"
              value={values.worldGenName}
              onChange={(e) => update({ worldGenName: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="worldmap-type">WorldMap Type</Label>
            <Input
              id="worldmap-type"
              type="text"
              value={values.worldMapType}
              onChange={(e) => update({ worldMapType: e.target.value })}
              disabled={disabled}
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
              value={values.chunkStorageType}
              onChange={(e) => update({ chunkStorageType: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="resource-storage">Resource Storage Type</Label>
            <Input
              id="resource-storage"
              type="text"
              value={values.resourceStorageType}
              onChange={(e) =>
                update({ resourceStorageType: e.target.value })
              }
              disabled={disabled}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="chunk-config">Chunk Config (JSON)</Label>
            <textarea
              id="chunk-config"
              value={values.chunkConfig}
              onChange={(e) => update({ chunkConfig: e.target.value })}
              disabled={disabled}
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
            checked={values.isPvpEnabled}
            onCheckedChange={(v) => update({ isPvpEnabled: v })}
          />
          <ToggleField
            id="fall-damage"
            label="Fall Damage Enabled"
            description="Players take damage from falling"
            checked={values.isFallDamageEnabled}
            onCheckedChange={(v) => update({ isFallDamageEnabled: v })}
          />
          <ToggleField
            id="game-time-paused"
            label="Game Time Paused"
            description="Freeze the in-game time progression"
            checked={values.isGameTimePaused}
            onCheckedChange={(v) => update({ isGameTimePaused: v })}
          />
          <div className="space-y-2 pt-2">
            <Label htmlFor="game-time">Game Time</Label>
            <Input
              id="game-time"
              type="text"
              value={values.gameTime}
              onChange={(e) => update({ gameTime: e.target.value })}
              disabled={disabled}
            />
          </div>
          <div className="space-y-2 pt-2">
            <Label htmlFor="gameplay-config">Gameplay Config</Label>
            <Input
              id="gameplay-config"
              type="text"
              value={values.gameplayConfig}
              onChange={(e) => update({ gameplayConfig: e.target.value })}
              disabled={disabled}
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
            checked={values.isSpawningNPC}
            onCheckedChange={(v) => update({ isSpawningNPC: v })}
          />
          <ToggleField
            id="spawn-markers"
            label="Spawn Markers Enabled"
            description="Use spawn marker points for NPC placement"
            checked={values.isSpawnMarkersEnabled}
            onCheckedChange={(v) => update({ isSpawnMarkersEnabled: v })}
          />
          <ToggleField
            id="all-npc-frozen"
            label="All NPCs Frozen"
            description="Freeze all NPC movement and AI"
            checked={values.isAllNPCFrozen}
            onCheckedChange={(v) => update({ isAllNPCFrozen: v })}
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
            checked={values.isTicking}
            onCheckedChange={(v) => update({ isTicking: v })}
          />
          <ToggleField
            id="block-ticking"
            label="Block Ticking"
            description="Process block-level tick updates"
            checked={values.isBlockTicking}
            onCheckedChange={(v) => update({ isBlockTicking: v })}
          />
          <ToggleField
            id="compass"
            label="Compass Updating"
            description="Update compass direction for players"
            checked={values.isCompassUpdating}
            onCheckedChange={(v) => update({ isCompassUpdating: v })}
          />
          <ToggleField
            id="objective-markers"
            label="Objective Markers Enabled"
            description="Show objective markers in the world"
            checked={values.isObjectiveMarkersEnabled}
            onCheckedChange={(v) =>
              update({ isObjectiveMarkersEnabled: v })
            }
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
            checked={values.isSavingPlayers}
            onCheckedChange={(v) => update({ isSavingPlayers: v })}
          />
          <ToggleField
            id="saving-chunks"
            label="Saving Chunks"
            description="Automatically save chunk data"
            checked={values.isSavingChunks}
            onCheckedChange={(v) => update({ isSavingChunks: v })}
          />
          <ToggleField
            id="unloading-chunks"
            label="Unloading Chunks"
            description="Unload chunks when no players are nearby"
            checked={values.isUnloadingChunks}
            onCheckedChange={(v) => update({ isUnloadingChunks: v })}
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
            checked={values.deleteOnUniverseStart}
            onCheckedChange={(v) => update({ deleteOnUniverseStart: v })}
          />
          <ToggleField
            id="delete-on-remove"
            label="Delete on Remove"
            description="Delete world data when the world is removed"
            checked={values.deleteOnRemove}
            onCheckedChange={(v) => update({ deleteOnRemove: v })}
          />
        </CardContent>
      </Card>

      {/* Plugins */}
      <Card>
        <CardHeader>
          <CardTitle>Plugins</CardTitle>
          <CardDescription>
            Plugin requirements and configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="required-plugins">Required Plugins (JSON)</Label>
            <textarea
              id="required-plugins"
              value={values.requiredPlugins}
              onChange={(e) => update({ requiredPlugins: e.target.value })}
              disabled={disabled}
              className="flex min-h-[80px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plugin-config">Plugin Config (JSON)</Label>
            <textarea
              id="plugin-config"
              value={values.plugin}
              onChange={(e) => update({ plugin: e.target.value })}
              disabled={disabled}
              className="flex min-h-[80px] w-full border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
