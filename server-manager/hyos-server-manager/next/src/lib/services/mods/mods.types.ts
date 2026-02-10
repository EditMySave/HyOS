import { z } from "zod";

// ============================================================================
// Installed Mod Types (from filesystem)
// ============================================================================

export const manifestInfoSchema = z.object({
  hasManifest: z.boolean(),
  main: z.string().nullable(),
  group: z.string().nullable(),
  name: z.string().nullable(),
  version: z.string().nullable(),
  dependencies: z.array(z.string()),
  serverVersion: z.string().nullable(),
});

export type ManifestInfo = z.infer<typeof manifestInfoSchema>;

export const installedModSchema = z.object({
  id: z.string(), // filename without extension
  name: z.string(), // filename with extension
  fileName: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  version: z.string().nullable(),
  author: z.string().nullable(),
  authors: z.array(z.string()),
  size: z.number(),
  modified: z.string(), // ISO date string
  path: z.string(),
  needsPatch: z.boolean(),
  isPatched: z.boolean(),
  manifestInfo: manifestInfoSchema.optional(),
  dependencies: z.array(z.string()),
  iconUrl: z.string().nullable(),
  providerSource: z.string().nullable(),
});

export const installedModsResponseSchema = z.object({
  mods: z.array(installedModSchema),
  count: z.number(),
});

export type InstalledMod = z.infer<typeof installedModSchema>;
export type InstalledModsResponse = z.infer<typeof installedModsResponseSchema>;

// ============================================================================
// Loaded Plugin Types (from REST API)
// ============================================================================

export const loadedPluginSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string(),
  state: z.enum(["ENABLED", "DISABLED", "LOADING", "ERROR", "UNLOADED"]),
  authors: z.array(z.string()),
  fileName: z.string().optional(),
  group: z.string().optional(),
});

export const loadedPluginsResponseSchema = z.object({
  count: z.number(),
  plugins: z.array(loadedPluginSchema),
});

export type LoadedPlugin = z.infer<typeof loadedPluginSchema>;
export type LoadedPluginsResponse = z.infer<typeof loadedPluginsResponseSchema>;

// ============================================================================
// Upload Types
// ============================================================================

export const uploadModResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  mod: installedModSchema.optional(),
});

export type UploadModResponse = z.infer<typeof uploadModResponseSchema>;

// ============================================================================
// Delete Types
// ============================================================================

export const deleteModResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type DeleteModResponse = z.infer<typeof deleteModResponseSchema>;

// ============================================================================
// Patch Types
// ============================================================================

export const patchModResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export type PatchModResponse = z.infer<typeof patchModResponseSchema>;

// ============================================================================
// Combined Mod Status
// ============================================================================

export const modStatusSchema = z.enum([
  "installed_and_loaded", // File exists and plugin is loaded
  "installed_only", // File exists but plugin not loaded (restart needed)
  "loaded_only", // Plugin loaded but file not found (shouldn't happen)
]);

export type ModStatus = z.infer<typeof modStatusSchema>;

// ============================================================================
// Update Check Types
// ============================================================================

export const modUpdateSchema = z.object({
  fileName: z.string(),
  currentVersion: z.string(),
  latestVersion: z.string(),
  latestFileId: z.string(),
  provider: z.string(),
  isCritical: z.boolean(),
});

export const modUpdatesResponseSchema = z.object({
  updates: z.array(modUpdateSchema),
  checkedAt: z.string(),
});

export type ModUpdate = z.infer<typeof modUpdateSchema>;
export type ModUpdatesResponse = z.infer<typeof modUpdatesResponseSchema>;
