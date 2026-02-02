import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  getInstalledMods,
  getLoadedPlugins,
  uploadMod,
  deleteMod,
} from "./mods.service";

// ============================================================================
// Query Hooks (Data Fetching)
// ============================================================================

/**
 * Hook to get installed mods (JAR files)
 */
export function useInstalledMods() {
  return useSWR("installed-mods", getInstalledMods, {
    refreshInterval: 30000, // Refresh every 30 seconds
    revalidateOnFocus: true,
  });
}

/**
 * Hook to get loaded plugins from the server
 */
export function useLoadedPlugins() {
  return useSWR("loaded-plugins", getLoadedPlugins, {
    refreshInterval: 10000, // Refresh every 10 seconds (more frequent for live status)
    revalidateOnFocus: true,
  });
}

// ============================================================================
// Mutation Hooks (Actions)
// ============================================================================

/**
 * Hook to upload a mod
 */
export function useUploadMod() {
  return useSWRMutation<
    Awaited<ReturnType<typeof uploadMod>>,
    Error,
    string,
    File
  >("upload-mod", async (_, { arg }) => uploadMod(arg), {
    onSuccess: () => {
      // Revalidate installed mods list after upload
      // This is handled by SWR's cache revalidation
    },
  });
}

/**
 * Hook to delete a mod
 */
export function useDeleteMod() {
  return useSWRMutation<
    Awaited<ReturnType<typeof deleteMod>>,
    Error,
    string,
    string
  >("delete-mod", async (_, { arg }) => deleteMod(arg), {
    onSuccess: () => {
      // Revalidate installed mods list after delete
      // This is handled by SWR's cache revalidation
    },
  });
}
