import { z } from "zod";

// ============================================================================
// Server Status Types
// ============================================================================

export const serverStateSchema = z.enum([
  "starting",
  "running",
  "stopping",
  "stopped",
  "error",
  "unknown",
]);

export const memoryInfoSchema = z.object({
  used: z.number(),
  max: z.number(),
  free: z.number(),
});

export const serverStatusSchema = z.object({
  online: z.boolean(),
  name: z.string(),
  motd: z.string(),
  version: z.string(),
  playerCount: z.number(),
  maxPlayers: z.number(),
  uptime: z.number().nullable(),
  memory: memoryInfoSchema.nullable(),
  state: serverStateSchema,
});

export type ServerStatus = z.infer<typeof serverStatusSchema>;
export type ServerState = z.infer<typeof serverStateSchema>;
export type MemoryInfo = z.infer<typeof memoryInfoSchema>;

// ============================================================================
// Version Types
// ============================================================================

export const versionInfoSchema = z.object({
  gameVersion: z.string(),
  revisionId: z.string(),
  patchline: z.string(),
  protocolVersion: z.number(),
});

export type VersionInfo = z.infer<typeof versionInfoSchema>;

// ============================================================================
// Auth Types
// ============================================================================

export const authStatusSchema = z.enum([
  "authenticated",
  "pending",
  "failed",
  "timeout",
  "unknown",
]);

export const authStateSchema = z.object({
  status: authStatusSchema,
  authenticated: z.boolean(),
  profile: z.string().nullable(),
  expiresAt: z.string().nullable(),
  authUrl: z.string().nullable(),
  authCode: z.string().nullable(),
  updatedAt: z.string().nullable(),
});

export type AuthState = z.infer<typeof authStateSchema>;
export type AuthStatus = z.infer<typeof authStatusSchema>;

// ============================================================================
// Command Types
// ============================================================================

export const commandResultSchema = z.object({
  success: z.boolean(),
  output: z.string(),
  error: z.string().optional(),
});

export type CommandResult = z.infer<typeof commandResultSchema>;

// ============================================================================
// Whitelist Types
// ============================================================================

export const whitelistActionSchema = z.enum([
  "add",
  "remove",
  "enable",
  "disable",
]);

export const whitelistInfoSchema = z.object({
  enabled: z.boolean(),
  playerCount: z.number(),
  players: z.array(z.string()),
});

export type WhitelistInfo = z.infer<typeof whitelistInfoSchema>;
export type WhitelistAction = z.infer<typeof whitelistActionSchema>;

// ============================================================================
// Update Check Types
// ============================================================================

export const updateCheckResultSchema = z.object({
  currentVersion: z.string(),
  latestVersion: z.string(),
  needsUpdate: z.boolean(),
  lastCheck: z.string().nullable(),
  message: z.string(),
  success: z.boolean().optional(),
  output: z.string().optional(),
});

export type UpdateCheckResult = z.infer<typeof updateCheckResultSchema>;

// ============================================================================
// Scheduled Update Types
// ============================================================================

export const scheduledUpdateStatusSchema = z.object({
  scheduled: z.boolean(),
  scheduledAt: z.string().nullable(),
  targetVersion: z.string().nullable(),
  scheduledBy: z.string().nullable(),
  success: z.boolean().optional(),
  message: z.string().optional(),
  output: z.string().optional(),
});

export type ScheduledUpdateStatus = z.infer<typeof scheduledUpdateStatusSchema>;
