import { z } from "zod";

// ============================================================================
// Worlds File Management Types
// ============================================================================

const fileInfoSchemaBase = z.object({
  name: z.string(),
  path: z.string(),
  type: z.enum(["file", "directory"]),
  size: z.number().optional(),
  modified: z.string().optional(),
});

export const fileInfoSchema: z.ZodType<{
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  modified?: string;
  children?: Array<{
    name: string;
    path: string;
    type: "file" | "directory";
    size?: number;
    modified?: string;
    children?: any;
  }>;
}> = fileInfoSchemaBase.extend({
  children: z.array(z.lazy(() => fileInfoSchema)).optional(),
});

export const filesResponseSchema = z.object({
  files: z.array(fileInfoSchema),
});

export const backupInfoSchema = z.object({
  name: z.string(),
  path: z.string(),
  size: z.number(),
  created: z.string(),
});

export const backupsResponseSchema = z.object({
  backups: z.array(backupInfoSchema),
});

export const uploadResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  filesAdded: z.number(),
  filesModified: z.number(),
  backupCreated: z.string().optional(),
});

export const backupCreateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  backupPath: z.string(),
  size: z.number().optional(),
});

// ============================================================================
// World Slots Types
// ============================================================================

export const slotTypeSchema = z
  .enum(["universe", "world-config"])
  .default("universe");

export const slotInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.string(),
  sourceFile: z.string().optional(),
  autoSaved: z.boolean().optional(),
  size: z.number().optional(),
  type: slotTypeSchema,
});

export const slotsResponseSchema = z.object({
  slots: z.array(slotInfoSchema),
});

export const activateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  autoSavedSlotId: z.string().optional(),
});

export const createSlotResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  slotId: z.string(),
  slotName: z.string(),
  filesAdded: z.number(),
  filesModified: z.number(),
});

export const renameSlotRequestSchema = z.object({
  name: z.string().min(1).max(100),
});

export const renameSlotResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  slot: slotInfoSchema,
});

export type FileInfo = z.infer<typeof fileInfoSchema>;
export type FilesResponse = z.infer<typeof filesResponseSchema>;
export type BackupInfo = z.infer<typeof backupInfoSchema>;
export type BackupsResponse = z.infer<typeof backupsResponseSchema>;
export type UploadResponse = z.infer<typeof uploadResponseSchema>;
export type BackupCreateResponse = z.infer<typeof backupCreateResponseSchema>;
export type SlotInfo = z.infer<typeof slotInfoSchema>;
export type SlotsResponse = z.infer<typeof slotsResponseSchema>;
export type ActivateResponse = z.infer<typeof activateResponseSchema>;
export type CreateSlotResponse = z.infer<typeof createSlotResponseSchema>;
export type RenameSlotRequest = z.infer<typeof renameSlotRequestSchema>;
export type RenameSlotResponse = z.infer<typeof renameSlotResponseSchema>;

// ============================================================================
// World Config Creation Types
// ============================================================================

export const createWorldConfigRequestSchema = z.object({
  name: z.string().min(1).max(100),
  seed: z.number().optional(),
  worldGen: z
    .object({ type: z.string(), name: z.string() })
    .optional(),
  worldMap: z.object({ type: z.string() }).optional(),
  chunkStorage: z.object({ type: z.string() }).optional(),
  chunkConfig: z.record(z.string(), z.unknown()).optional(),
  resourceStorage: z.object({ type: z.string() }).optional(),
  isTicking: z.boolean().optional(),
  isBlockTicking: z.boolean().optional(),
  isPvpEnabled: z.boolean().optional(),
  isFallDamageEnabled: z.boolean().optional(),
  isGameTimePaused: z.boolean().optional(),
  gameTime: z.string().optional(),
  gameplayConfig: z.string().optional(),
  isSpawningNPC: z.boolean().optional(),
  isSpawnMarkersEnabled: z.boolean().optional(),
  isAllNPCFrozen: z.boolean().optional(),
  isCompassUpdating: z.boolean().optional(),
  isSavingPlayers: z.boolean().optional(),
  isSavingChunks: z.boolean().optional(),
  isUnloadingChunks: z.boolean().optional(),
  isObjectiveMarkersEnabled: z.boolean().optional(),
  deleteOnUniverseStart: z.boolean().optional(),
  deleteOnRemove: z.boolean().optional(),
  requiredPlugins: z.record(z.string(), z.unknown()).optional(),
  plugin: z.record(z.string(), z.unknown()).optional(),
});

export type CreateWorldConfigRequest = z.infer<
  typeof createWorldConfigRequestSchema
>;
