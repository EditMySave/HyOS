"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { useCreateWorldFromConfig } from "@/lib/services/worlds";
import {
  type WorldConfigFormValues,
  WorldConfigForm,
  getDefaultFormValues,
} from "../_components/world-config-form";

export default function CreateWorldPage() {
  const router = useRouter();
  const { trigger: createWorld, isMutating } = useCreateWorldFromConfig();
  const [values, setValues] = useState<WorldConfigFormValues>(
    getDefaultFormValues,
  );

  const handleSubmit = useCallback(async () => {
    if (!values.name.trim()) return;

    let parsedChunkConfig = {};
    let parsedRequiredPlugins = {};
    let parsedPlugin = {};

    try {
      parsedChunkConfig = JSON.parse(values.chunkConfig);
    } catch {
      alert("Invalid JSON in Chunk Config");
      return;
    }

    try {
      parsedRequiredPlugins = JSON.parse(values.requiredPlugins);
    } catch {
      alert("Invalid JSON in Required Plugins");
      return;
    }

    try {
      parsedPlugin = JSON.parse(values.plugin);
    } catch {
      alert("Invalid JSON in Plugin");
      return;
    }

    try {
      await createWorld({
        name: values.name.trim(),
        seed: values.seed,
        worldGen: { type: values.worldGenType, name: values.worldGenName },
        worldMap: { type: values.worldMapType },
        chunkStorage: { type: values.chunkStorageType },
        chunkConfig: parsedChunkConfig,
        resourceStorage: { type: values.resourceStorageType },
        isTicking: values.isTicking,
        isBlockTicking: values.isBlockTicking,
        isPvpEnabled: values.isPvpEnabled,
        isFallDamageEnabled: values.isFallDamageEnabled,
        isGameTimePaused: values.isGameTimePaused,
        gameTime: values.gameTime,
        gameplayConfig: values.gameplayConfig,
        isSpawningNPC: values.isSpawningNPC,
        isSpawnMarkersEnabled: values.isSpawnMarkersEnabled,
        isAllNPCFrozen: values.isAllNPCFrozen,
        isCompassUpdating: values.isCompassUpdating,
        isSavingPlayers: values.isSavingPlayers,
        isSavingChunks: values.isSavingChunks,
        isUnloadingChunks: values.isUnloadingChunks,
        isObjectiveMarkersEnabled: values.isObjectiveMarkersEnabled,
        deleteOnUniverseStart: values.deleteOnUniverseStart,
        deleteOnRemove: values.deleteOnRemove,
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
  }, [values, createWorld, router]);

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

      <WorldConfigForm values={values} onChange={setValues} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pb-6">
        <Button variant="outline" asChild>
          <Link href="/worlds">Cancel</Link>
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={
            isMutating ||
            !values.name.trim() ||
            values.name.trim().length > 100
          }
        >
          {isMutating ? "Creating..." : "Create World"}
        </Button>
      </div>
    </div>
  );
}
