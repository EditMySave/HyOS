import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import { mutate } from "swr";
import {
  getUniverseFiles,
  getSlots,
  createSlot,
  activateSlot,
  deleteSlot,
  renameSlot,
} from "./worlds.service";
import type {
  FilesResponse,
  SlotsResponse,
  CreateSlotResponse,
  ActivateResponse,
  RenameSlotResponse,
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
