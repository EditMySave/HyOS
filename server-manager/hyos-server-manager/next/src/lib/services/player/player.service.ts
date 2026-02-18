import { z } from "zod";
import {
  type GameModeInfo,
  type GroupsInfo,
  gameModeInfoSchema,
  groupsInfoSchema,
  type InventorySection,
  type MuteInfo,
  muteInfoSchema,
  type PermissionsInfo,
  type Player,
  type PlayerLocation,
  type PlayerStats,
  permissionsInfoSchema,
  playerLocationSchema,
  playerSchema,
  playerStatsSchema,
  type TeleportResult,
  teleportResultSchema,
} from "./player.types";

/**
 * Get list of online players
 */
export async function getPlayers(): Promise<Player[]> {
  const response = await fetch("/api/server/players");
  if (!response.ok) {
    throw new Error(`Failed to fetch players: ${response.statusText}`);
  }
  const data = await response.json();
  const playersSchema = z.object({
    count: z.number(),
    players: z.array(playerSchema),
  });
  const parsed = playersSchema.parse(data);
  return parsed.players;
}

/**
 * Kick a player
 */
export async function kickPlayer(uuid: string, reason?: string): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/kick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason: reason || "Kicked by admin" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to kick player: ${response.statusText}`);
  }
}

/**
 * Ban a player
 */
export async function banPlayer(
  uuid: string,
  reason?: string,
  duration?: number,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/ban`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      reason: reason || "Banned by admin",
      duration: duration,
      permanent: duration === undefined,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to ban player: ${response.statusText}`);
  }
}

/**
 * Send a message to a player
 */
export async function sendMessage(
  uuid: string,
  message: string,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error(`Failed to send message: ${response.statusText}`);
  }
}

/**
 * Teleport a player to coordinates
 */
export async function teleportPlayer(
  uuid: string,
  x: number,
  y: number,
  z: number,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/teleport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y, z }),
  });
  if (!response.ok) {
    throw new Error(`Failed to teleport player: ${response.statusText}`);
  }
}

/**
 * Teleport a player with full options
 */
export async function teleportPlayerFull(
  uuid: string,
  options: {
    x?: number;
    y?: number;
    z?: number;
    world?: string;
    yaw?: number;
    pitch?: number;
  },
): Promise<TeleportResult> {
  const response = await fetch(`/api/player/${uuid}/teleport`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      x: options.x ?? null,
      y: options.y ?? null,
      z: options.z ?? null,
      world: options.world ?? null,
      yaw: options.yaw ?? null,
      pitch: options.pitch ?? null,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to teleport player: ${response.statusText}`);
  }
  const data = await response.json();
  return teleportResultSchema.parse(data);
}

/**
 * Get player location
 */
export async function getPlayerLocation(uuid: string): Promise<PlayerLocation> {
  const response = await fetch(`/api/player/${uuid}/location`);
  if (!response.ok) {
    throw new Error(`Failed to get player location: ${response.statusText}`);
  }
  const data = await response.json();
  return playerLocationSchema.parse(data);
}

/**
 * Get player stats
 */
export async function getPlayerStats(uuid: string): Promise<PlayerStats> {
  const response = await fetch(`/api/player/${uuid}/stats`);
  if (!response.ok) {
    throw new Error(`Failed to get player stats: ${response.statusText}`);
  }
  const data = await response.json();
  return playerStatsSchema.parse(data);
}

/**
 * Give an item to a player
 */
export async function giveItem(
  uuid: string,
  itemId: string,
  amount: number,
  slot?: string,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/inventory/give`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId, amount, slot: slot || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to give item: ${response.statusText}`);
  }
}

/**
 * Clear a player's inventory
 */
export async function clearInventory(
  uuid: string,
  section?: InventorySection,
): Promise<void> {
  const response = await fetch(`/api/player/${uuid}/inventory/clear`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ section: section || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to clear inventory: ${response.statusText}`);
  }
}

/**
 * Get player's game mode
 */
export async function getGameMode(uuid: string): Promise<GameModeInfo> {
  const response = await fetch(`/api/player/${uuid}/gamemode`);
  if (!response.ok) {
    throw new Error(`Failed to get game mode: ${response.statusText}`);
  }
  const data = await response.json();
  return gameModeInfoSchema.parse(data);
}

/**
 * Set player's game mode
 */
export async function setGameMode(
  uuid: string,
  gameMode: string,
): Promise<GameModeInfo> {
  const response = await fetch(`/api/player/${uuid}/gamemode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameMode }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set game mode: ${response.statusText}`);
  }
  const data = await response.json();
  return gameModeInfoSchema.parse(data);
}

/**
 * Get player's permissions
 */
export async function getPermissions(uuid: string): Promise<PermissionsInfo> {
  const response = await fetch(`/api/player/${uuid}/permissions`);
  if (!response.ok) {
    throw new Error(`Failed to get permissions: ${response.statusText}`);
  }
  const data = await response.json();
  return permissionsInfoSchema.parse(data);
}

/**
 * Grant a permission to a player
 */
export async function grantPermission(
  uuid: string,
  permission: string,
): Promise<PermissionsInfo> {
  const response = await fetch(`/api/player/${uuid}/permissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ permission }),
  });
  if (!response.ok) {
    throw new Error(`Failed to grant permission: ${response.statusText}`);
  }
  const data = await response.json();
  return permissionsInfoSchema.parse(data);
}

/**
 * Revoke a permission from a player
 */
export async function revokePermission(
  uuid: string,
  permission: string,
): Promise<PermissionsInfo> {
  const response = await fetch(
    `/api/player/${uuid}/permissions/${encodeURIComponent(permission)}`,
    {
      method: "DELETE",
    },
  );
  if (!response.ok) {
    throw new Error(`Failed to revoke permission: ${response.statusText}`);
  }
  const data = await response.json();
  return permissionsInfoSchema.parse(data);
}

/**
 * Get player's groups
 */
export async function getGroups(uuid: string): Promise<GroupsInfo> {
  const response = await fetch(`/api/player/${uuid}/groups`);
  if (!response.ok) {
    throw new Error(`Failed to get groups: ${response.statusText}`);
  }
  const data = await response.json();
  return groupsInfoSchema.parse(data);
}

/**
 * Add player to a group
 */
export async function addToGroup(
  uuid: string,
  group: string,
): Promise<GroupsInfo> {
  const response = await fetch(`/api/player/${uuid}/groups`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ group }),
  });
  if (!response.ok) {
    throw new Error(`Failed to add to group: ${response.statusText}`);
  }
  const data = await response.json();
  return groupsInfoSchema.parse(data);
}

/**
 * Mute a player
 */
export async function mutePlayer(
  uuid: string,
  durationMinutes?: number,
  reason?: string,
): Promise<MuteInfo> {
  const response = await fetch(`/api/player/${uuid}/mute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      durationMinutes: durationMinutes || null,
      reason: reason || null,
    }),
  });
  if (!response.ok) {
    throw new Error(`Failed to mute player: ${response.statusText}`);
  }
  const data = await response.json();
  return muteInfoSchema.parse(data);
}
