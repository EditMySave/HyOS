import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  getUniverseFiles,
  getSlots,
  createSlot,
  activateSlot,
  deleteSlot,
} from "./worlds.service";
import type {
  FilesResponse,
  SlotsResponse,
  CreateSlotResponse,
  ActivateResponse,
} from "./worlds.types";

/**
 * Hook to fetch universe files
 */
export function useUniverseFiles() {
  return useSWR<FilesResponse>(
    "universe-files",
    () => getUniverseFiles(),
    {
      refreshInterval: 0, // Manual refresh only
      revalidateOnFocus: false,
    },
  );
}


/**
 * Hook to fetch slots
 */
export function useSlots() {
  return useSWR<SlotsResponse>(
    "universe-slots",
    () => getSlots(),
    {
      refreshInterval: 0, // Manual refresh only
      revalidateOnFocus: false,
    },
  );
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
  return useSWRMutation<{ success: boolean; message: string }, Error, string, string>(
    "delete-slot",
    async (_, { arg }) => deleteSlot(arg),
  );
}
