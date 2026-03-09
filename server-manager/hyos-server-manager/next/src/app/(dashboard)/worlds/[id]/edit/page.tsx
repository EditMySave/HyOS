"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useActiveWorldConfig,
  useUpdateActiveWorldConfig,
  useUpdateWorldConfig,
  useWorldConfig,
} from "@/lib/services/worlds";
import {
  type WorldConfigFormValues,
  WorldConfigForm,
  configToFormValues,
  getDefaultFormValues,
} from "../../_components/world-config-form";

export default function EditWorldPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const isActive = id === "active";

  const slotConfig = useWorldConfig(isActive ? "" : id);
  const activeConfig = useActiveWorldConfig();

  const { data, error, isLoading } = isActive ? activeConfig : slotConfig;

  const { trigger: updateSlotConfig, isMutating: isSlotMutating } =
    useUpdateWorldConfig();
  const { trigger: updateActiveConfig, isMutating: isActiveMutating } =
    useUpdateActiveWorldConfig();

  const isMutating = isActive ? isActiveMutating : isSlotMutating;

  const [values, setValues] = useState<WorldConfigFormValues>(
    getDefaultFormValues,
  );
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (data && !initialized) {
      setValues(configToFormValues(data.config, data.slotName));
      setInitialized(true);
    }
  }, [data, initialized]);

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

    const configPayload = {
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
    };

    try {
      if (isActive) {
        await updateActiveConfig(configPayload);
      } else {
        await updateSlotConfig({ slotId: id, config: configPayload });
      }
      router.push("/worlds");
    } catch (error) {
      console.error("Update world failed:", error);
      alert(
        error instanceof Error ? error.message : "Failed to update world",
      );
    }
  }, [values, updateSlotConfig, updateActiveConfig, isActive, id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-muted-foreground">Loading world config...</p>
      </div>
    );
  }

  if (error) {
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
              Edit World
            </h1>
          </div>
        </div>
        <p className="text-destructive">
          Failed to load config: {error.message}
        </p>
      </div>
    );
  }

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
            Edit World — {values.name}
          </h1>
          <p className="text-muted-foreground">
            {isActive
              ? "Modify the configuration for the active world"
              : "Modify the world configuration for this slot"}
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
          {isMutating ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </div>
  );
}
