import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import {
  activateSlot,
  createSlot,
  createWorldFromConfig,
  deleteSlot,
  getSlots,
  getUniverseFiles,
  getWorldConfig,
  renameSlot,
  updateWorldConfig,
} from "./worlds.service";
import type {
  ActivateResponse,
  CreateSlotResponse,
  CreateWorldConfigRequest,
  FilesResponse,
  RenameSlotResponse,
  SlotsResponse,
  WorldConfigResponse,
} from "./worlds.types";

/**
 * Hook to fetch universe files
 */
export function useUniverseFiles() {
  return useSWR<FilesResponse>("universe-files", () => getUniverseFiles(), {
    refreshInterval: 0, // Manual refresh only
    revalidateOnFocus: false,
  });
}

/**
 * Hook to fetch slots
 */
export function useSlots() {
  return useSWR<SlotsResponse>("universe-slots", () => getSlots(), {
    refreshInterval: 0, // Manual refresh only
    revalidateOnFocus: false,
  });
}

/**
 * Hook to fetch world config for a slot
 */
export function useWorldConfig(slotId: string) {
  return useSWR<WorldConfigResponse>(
    slotId ? `world-config-${slotId}` : null,
    () => getWorldConfig(slotId),
    {
      revalidateOnFocus: false,
    },
  );
}

/**
 * Hook to update world config for a slot
 */
export function useUpdateWorldConfig() {
  return useSWRMutation<
    { success: boolean; message: string },
    Error,
    string,
    { slotId: string; config: CreateWorldConfigRequest }
  >("update-world-config", async (_, { arg }) => {
    const result = await updateWorldConfig(arg.slotId, arg.config);
    await mutate(`world-config-${arg.slotId}`);
    await mutate("universe-slots");
    return result;
  });
}

/**
 * Hook to create a world slot from a config definition
 */
export function useCreateWorldFromConfig() {
  return useSWRMutation<
    CreateSlotResponse,
    Error,
    string,
    CreateWorldConfigRequest
  >("create-world-config", async (_, { arg }) => {
    const result = await createWorldFromConfig(arg);
    await mutate("universe-slots");
    return result;
  });
}

/**
 * Hook to create slot from upload
 */
export function useCreateSlot() {
  return useSWRMutation<CreateSlotResponse, Error, string, File>(
    "create-slot",
    async (_, { arg }) => createSlot(arg),
  );
}

/**
 * Hook to activate a slot
 */
export function useActivateSlot() {
  return useSWRMutation<ActivateResponse, Error, string, string>(
    "activate-slot",
    async (_, { arg }) => activateSlot(arg),
  );
}

/**
 * Hook to delete a slot
 */
export function useDeleteSlot() {
  return useSWRMutation<
    { success: boolean; message: string },
    Error,
    string,
    string
  >("delete-slot", async (_, { arg }) => deleteSlot(arg));
}

/**
 * Hook to rename a slot
 */
export function useRenameSlot() {
  return useSWRMutation<
    RenameSlotResponse,
    Error,
    string,
    { slotId: string; newName: string }
  >("rename-slot", async (_, { arg }) => {
    const result = await renameSlot(arg.slotId, arg.newName);
    // Invalidate slots cache to refresh the list
    await mutate("universe-slots");
    return result;
  });
}
