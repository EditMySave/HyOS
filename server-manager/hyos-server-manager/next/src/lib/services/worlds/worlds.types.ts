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

export const slotInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  created: z.string(),
  sourceFile: z.string().optional(),
  autoSaved: z.boolean().optional(),
  size: z.number().optional(),
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
