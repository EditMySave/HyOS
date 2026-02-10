import {
  type InstalledModsResponse,
  installedModsResponseSchema,
  type LoadedPluginsResponse,
  loadedPluginsResponseSchema,
  type UploadModResponse,
  uploadModResponseSchema,
  type DeleteModResponse,
  deleteModResponseSchema,
  type PatchModResponse,
  patchModResponseSchema,
  type ModUpdatesResponse,
  modUpdatesResponseSchema,
} from "./mods.types";

/**
 * Get list of installed mods (JAR files in /data/mods)
 */
export async function getInstalledMods(): Promise<InstalledModsResponse> {
  const response = await fetch("/api/mods");
  if (!response.ok) {
    throw new Error(`Failed to fetch installed mods: ${response.statusText}`);
  }
  const data = await response.json();
  return installedModsResponseSchema.parse(data);
}

/**
 * Get list of loaded plugins from the Hytale server REST API
 */
export async function getLoadedPlugins(): Promise<LoadedPluginsResponse> {
  const response = await fetch("/api/mods/loaded");
  if (!response.ok) {
    throw new Error(`Failed to fetch loaded plugins: ${response.statusText}`);
  }
  const data = await response.json();
  return loadedPluginsResponseSchema.parse(data);
}

/**
 * Upload a mod JAR file
 */
export async function uploadMod(file: File): Promise<UploadModResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/mods/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to upload mod: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return uploadModResponseSchema.parse(data);
}

/**
 * Delete an installed mod
 */
export async function deleteMod(modId: string): Promise<DeleteModResponse> {
  const response = await fetch(`/api/mods/${modId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to delete mod: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return deleteModResponseSchema.parse(data);
}

/**
 * Patch a content-only mod by injecting a stub Main class
 */
export async function patchMod(modId: string): Promise<PatchModResponse> {
  const response = await fetch(`/api/mods/${modId}/patch`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      (error as { error?: string })?.error ??
        `Failed to patch mod: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return patchModResponseSchema.parse(data);
}

/**
 * Check for mod updates from providers
 */
export async function getModUpdates(): Promise<ModUpdatesResponse> {
  const response = await fetch("/api/mods/updates");
  if (!response.ok) {
    throw new Error(`Failed to check updates: ${response.statusText}`);
  }
  const data = await response.json();
  return modUpdatesResponseSchema.parse(data);
}
