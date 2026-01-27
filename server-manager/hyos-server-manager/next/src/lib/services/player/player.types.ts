import { z } from "zod";

// ============================================================================
// Player Types
// ============================================================================

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
  z: z.number(),
});

export const playerSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  world: z.string(),
  position: positionSchema,
  connectedAt: z.number(),
  ping: z.number().optional(),
});

export const playerStatsSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  health: z.number(),
  maxHealth: z.number(),
  mana: z.number(),
  maxMana: z.number(),
  stamina: z.number(),
  maxStamina: z.number(),
  oxygen: z.number(),
  maxOxygen: z.number(),
});

export const rotationSchema = z.object({
  yaw: z.number(),
  pitch: z.number(),
});

export const playerLocationSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  world: z.string(),
  position: positionSchema,
  rotation: rotationSchema,
});

export const gameModeInfoSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  gameMode: z.string(),
});

export const permissionsInfoSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  permissions: z.array(z.string()),
});

export const groupsInfoSchema = z.object({
  uuid: z.string(),
  name: z.string(),
  groups: z.array(z.string()),
});

export const muteInfoSchema = z.object({
  success: z.boolean(),
  uuid: z.string(),
  name: z.string(),
  durationMinutes: z.number().nullable(),
  reason: z.string(),
  expiresAt: z.number(),
});

export const teleportResultSchema = z.object({
  success: z.boolean(),
  uuid: z.string(),
  name: z.string(),
  world: z.string(),
  position: positionSchema,
});

export const inventorySectionSchema = z.enum([
  "all",
  "hotbar",
  "armor",
  "storage",
  "utility",
  "tools",
]);

export type Player = z.infer<typeof playerSchema>;
export type Position = z.infer<typeof positionSchema>;
export type PlayerStats = z.infer<typeof playerStatsSchema>;
export type Rotation = z.infer<typeof rotationSchema>;
export type PlayerLocation = z.infer<typeof playerLocationSchema>;
export type GameModeInfo = z.infer<typeof gameModeInfoSchema>;
export type PermissionsInfo = z.infer<typeof permissionsInfoSchema>;
export type GroupsInfo = z.infer<typeof groupsInfoSchema>;
export type MuteInfo = z.infer<typeof muteInfoSchema>;
export type TeleportResult = z.infer<typeof teleportResultSchema>;
export type InventorySection = z.infer<typeof inventorySectionSchema>;
