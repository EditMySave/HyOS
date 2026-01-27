import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  getPlayers,
  getPlayerLocation,
  getPlayerStats,
  getGameMode,
  setGameMode,
  getPermissions,
  grantPermission,
  revokePermission,
  getGroups,
  addToGroup,
  kickPlayer,
  banPlayer,
  sendMessage,
  teleportPlayer,
  teleportPlayerFull,
  giveItem,
  clearInventory,
  mutePlayer,
} from "./player.service";
import type {
  Player,
  PlayerLocation,
  PlayerStats,
  GameModeInfo,
  PermissionsInfo,
  GroupsInfo,
  MuteInfo,
  TeleportResult,
  InventorySection,
} from "./player.types";

/**
 * Hook to get list of online players with auto-refresh
 * Default 15 seconds to avoid rate limiting
 */
export function usePlayers(refreshInterval = 15000) {
  return useSWR<Player[]>("players", getPlayers, {
    refreshInterval,
    dedupingInterval: 5000, // Prevent duplicate requests within 5s
  });
}

/**
 * Hook to get a specific player's location
 */
export function usePlayerLocation(uuid: string | null) {
  return useSWR<PlayerLocation>(
    uuid ? `player-location-${uuid}` : null,
    uuid ? () => getPlayerLocation(uuid) : null,
  );
}

/**
 * Hook to get a specific player's stats
 */
export function usePlayerStats(uuid: string | null) {
  return useSWR<PlayerStats>(
    uuid ? `player-stats-${uuid}` : null,
    uuid ? () => getPlayerStats(uuid) : null,
  );
}

/**
 * Hook to get a player's game mode
 */
export function useGameMode(uuid: string | null) {
  return useSWR<GameModeInfo>(
    uuid ? `game-mode-${uuid}` : null,
    uuid ? () => getGameMode(uuid) : null,
  );
}

/**
 * Hook to set a player's game mode
 */
export function useSetGameMode() {
  return useSWRMutation<
    GameModeInfo,
    Error,
    string,
    { uuid: string; gameMode: string }
  >("set-game-mode", async (_, { arg }) => setGameMode(arg.uuid, arg.gameMode));
}

/**
 * Hook to get a player's permissions
 */
export function usePermissions(uuid: string | null) {
  return useSWR<PermissionsInfo>(
    uuid ? `permissions-${uuid}` : null,
    uuid ? () => getPermissions(uuid) : null,
  );
}

/**
 * Hook to grant a permission
 */
export function useGrantPermission() {
  return useSWRMutation<
    PermissionsInfo,
    Error,
    string,
    { uuid: string; permission: string }
  >("grant-permission", async (_, { arg }) =>
    grantPermission(arg.uuid, arg.permission),
  );
}

/**
 * Hook to revoke a permission
 */
export function useRevokePermission() {
  return useSWRMutation<
    PermissionsInfo,
    Error,
    string,
    { uuid: string; permission: string }
  >("revoke-permission", async (_, { arg }) =>
    revokePermission(arg.uuid, arg.permission),
  );
}

/**
 * Hook to get a player's groups
 */
export function useGroups(uuid: string | null) {
  return useSWR<GroupsInfo>(
    uuid ? `groups-${uuid}` : null,
    uuid ? () => getGroups(uuid) : null,
  );
}

/**
 * Hook to add a player to a group
 */
export function useAddToGroup() {
  return useSWRMutation<
    GroupsInfo,
    Error,
    string,
    { uuid: string; group: string }
  >("add-to-group", async (_, { arg }) => addToGroup(arg.uuid, arg.group));
}

/**
 * Hook to kick a player
 */
export function useKickPlayer() {
  return useSWRMutation<void, Error, string, { uuid: string; reason?: string }>(
    "kick-player",
    async (_, { arg }) => kickPlayer(arg.uuid, arg.reason),
  );
}

/**
 * Hook to ban a player
 */
export function useBanPlayer() {
  return useSWRMutation<
    void,
    Error,
    string,
    { uuid: string; reason?: string; duration?: number }
  >("ban-player", async (_, { arg }) =>
    banPlayer(arg.uuid, arg.reason, arg.duration),
  );
}

/**
 * Hook to send a message to a player
 */
export function useSendMessage() {
  return useSWRMutation<void, Error, string, { uuid: string; message: string }>(
    "send-message",
    async (_, { arg }) => sendMessage(arg.uuid, arg.message),
  );
}

/**
 * Hook to teleport a player
 */
export function useTeleportPlayer() {
  return useSWRMutation<
    void,
    Error,
    string,
    { uuid: string; x: number; y: number; z: number }
  >("teleport-player", async (_, { arg }) =>
    teleportPlayer(arg.uuid, arg.x, arg.y, arg.z),
  );
}

/**
 * Hook to teleport a player with full options
 */
export function useTeleportPlayerFull() {
  return useSWRMutation<
    TeleportResult,
    Error,
    string,
    {
      uuid: string;
      x?: number;
      y?: number;
      z?: number;
      world?: string;
      yaw?: number;
      pitch?: number;
    }
  >("teleport-player-full", async (_, { arg }) =>
    teleportPlayerFull(arg.uuid, arg),
  );
}

/**
 * Hook to give an item to a player
 */
export function useGiveItem() {
  return useSWRMutation<
    void,
    Error,
    string,
    { uuid: string; itemId: string; amount: number; slot?: string }
  >("give-item", async (_, { arg }) =>
    giveItem(arg.uuid, arg.itemId, arg.amount, arg.slot),
  );
}

/**
 * Hook to clear a player's inventory
 */
export function useClearInventory() {
  return useSWRMutation<
    void,
    Error,
    string,
    { uuid: string; section?: InventorySection }
  >("clear-inventory", async (_, { arg }) =>
    clearInventory(arg.uuid, arg.section),
  );
}

/**
 * Hook to mute a player
 */
export function useMutePlayer() {
  return useSWRMutation<
    MuteInfo,
    Error,
    string,
    { uuid: string; durationMinutes?: number; reason?: string }
  >("mute-player", async (_, { arg }) =>
    mutePlayer(arg.uuid, arg.durationMinutes, arg.reason),
  );
}
