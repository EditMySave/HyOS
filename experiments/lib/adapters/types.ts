/**
 * Server Adapter Types
 *
 * Core interfaces for communicating with the Hytale server.
 * Designed to be implementation-agnostic - can be backed by
 * console commands, REST API, or other mechanisms.
 */

// ============================================================================
// Server Status Types
// ============================================================================

export interface ServerStatus {
  online: boolean;
  name: string;
  motd: string;
  version: string;
  playerCount: number;
  maxPlayers: number;
  uptime: number | null;
  memory: MemoryInfo | null;
  state: ServerState;
}

export type ServerState =
  | "starting"
  | "running"
  | "stopping"
  | "stopped"
  | "error"
  | "unknown";

export interface MemoryInfo {
  used: number;
  max: number;
  free: number;
}

export interface VersionInfo {
  gameVersion: string;
  revisionId: string;
  patchline: string;
  protocolVersion: number;
}

// ============================================================================
// Player Types
// ============================================================================

export interface Player {
  uuid: string;
  name: string;
  world: string;
  position: Position;
  connectedAt: number;
  ping?: number;
}

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface PlayerStats {
  uuid: string;
  name: string;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  oxygen: number;
  maxOxygen: number;
}

export interface PlayerLocation {
  uuid: string;
  name: string;
  world: string;
  position: Position;
  rotation: Rotation;
}

export interface Rotation {
  yaw: number;
  pitch: number;
}

export interface GameModeInfo {
  uuid: string;
  name: string;
  gameMode: string;
}

export interface PermissionsInfo {
  uuid: string;
  name: string;
  permissions: string[];
}

export interface GroupsInfo {
  uuid: string;
  name: string;
  groups: string[];
}

export interface MuteInfo {
  success: boolean;
  uuid: string;
  name: string;
  durationMinutes: number | null;
  reason: string;
  expiresAt: number;
}

export interface TeleportResult {
  success: boolean;
  uuid: string;
  name: string;
  world: string;
  position: Position;
}

export interface WhitelistInfo {
  enabled: boolean;
  playerCount: number;
  players: string[];
}

export type WhitelistAction = "add" | "remove" | "enable" | "disable";

export interface WorldTimeInfo {
  world: string;
  time: number;
  dayTime: number;
  phase: string;
}

export interface WorldWeatherInfo {
  world: string;
  weather: string;
  remainingTicks: number;
  isThundering: boolean;
}

export interface BlockInfo {
  world: string;
  x: number;
  y: number;
  z: number;
  blockId: string;
  properties: Record<string, string>;
}

export interface AdminActionResult {
  success: boolean;
  action: string;
  target: string;
  message: string;
}

export type InventorySection =
  | "all"
  | "hotbar"
  | "armor"
  | "storage"
  | "utility"
  | "tools";

// ============================================================================
// Command Types
// ============================================================================

export interface CommandResult {
  success: boolean;
  output: string;
  error?: string;
}

// ============================================================================
// World Types
// ============================================================================

export interface WorldInfo {
  uuid: string;
  name: string;
  playerCount: number;
  type: string;
}

export type Weather = "clear" | "rain" | "thunder";

// ============================================================================
// Auth Types (from config-truenas state files)
// ============================================================================

export interface AuthState {
  authenticated: boolean;
  username: string | null;
  uuid: string | null;
  lastRefresh: string | null;
  expiresAt: string | null;
}

// ============================================================================
// Server Adapter Interface
// ============================================================================

/**
 * Abstract interface for communicating with the Hytale server.
 *
 * Implementations:
 * - ConsoleAdapter: Uses Docker exec + HyQuery UDP + state files
 * - RestAdapter: Uses REST API plugin (future)
 */
export interface ServerAdapter {
  // -------------------------------------------------------------------------
  // Status & Info
  // -------------------------------------------------------------------------

  /**
   * Get current server status including player count, memory, etc.
   */
  getStatus(): Promise<ServerStatus>;

  /**
   * Get list of online players with their positions
   */
  getPlayers(): Promise<Player[]>;

  /**
   * Get detailed version information
   */
  getVersion(): Promise<VersionInfo>;

  /**
   * Get authentication state from the server
   */
  getAuthState(): Promise<AuthState>;

  // -------------------------------------------------------------------------
  // Server Control
  // -------------------------------------------------------------------------

  /**
   * Start the server (if stopped)
   */
  start(): Promise<void>;

  /**
   * Stop the server gracefully
   */
  stop(): Promise<void>;

  /**
   * Restart the server
   */
  restart(): Promise<void>;

  // -------------------------------------------------------------------------
  // Commands
  // -------------------------------------------------------------------------

  /**
   * Execute a raw server command
   * @param command - Command string without leading slash
   */
  executeCommand(command: string): Promise<CommandResult>;

  // -------------------------------------------------------------------------
  // Player Actions
  // -------------------------------------------------------------------------

  /**
   * Kick a player from the server
   */
  kickPlayer(uuid: string, reason?: string): Promise<void>;

  /**
   * Ban a player from the server
   * @param duration - Duration in minutes (undefined = permanent)
   */
  banPlayer(uuid: string, reason?: string, duration?: number): Promise<void>;

  /**
   * Unban a player
   */
  unbanPlayer(uuid: string): Promise<void>;

  /**
   * Send a private message to a player
   */
  sendMessage(uuid: string, message: string): Promise<void>;

  /**
   * Teleport a player to coordinates
   */
  teleportPlayer(uuid: string, x: number, y: number, z: number): Promise<void>;

  /**
   * Give an item to a player
   */
  giveItem(
    uuid: string,
    itemId: string,
    amount: number,
    slot?: string,
  ): Promise<void>;

  /**
   * Clear a player's inventory
   */
  clearInventory(uuid: string, section?: InventorySection): Promise<void>;

  /**
   * Get player's current game mode
   */
  getGameMode(uuid: string): Promise<GameModeInfo>;

  /**
   * Set player's game mode
   */
  setGameMode(uuid: string, gameMode: string): Promise<GameModeInfo>;

  /**
   * Get player's permissions
   */
  getPermissions(uuid: string): Promise<PermissionsInfo>;

  /**
   * Grant a permission to a player
   */
  grantPermission(uuid: string, permission: string): Promise<PermissionsInfo>;

  /**
   * Revoke a permission from a player
   */
  revokePermission(uuid: string, permission: string): Promise<PermissionsInfo>;

  /**
   * Get player's groups
   */
  getGroups(uuid: string): Promise<GroupsInfo>;

  /**
   * Add player to a group
   */
  addToGroup(uuid: string, group: string): Promise<GroupsInfo>;

  /**
   * Mute a player
   */
  mutePlayer(
    uuid: string,
    durationMinutes?: number,
    reason?: string,
  ): Promise<MuteInfo>;

  /**
   * Teleport a player with full options
   */
  teleportPlayerFull(
    uuid: string,
    options: {
      x?: number;
      y?: number;
      z?: number;
      world?: string;
      yaw?: number;
      pitch?: number;
    },
  ): Promise<TeleportResult>;

  /**
   * Get player location
   */
  getPlayerLocation(uuid: string): Promise<PlayerLocation>;

  /**
   * Get player stats
   */
  getPlayerStats(uuid: string): Promise<PlayerStats>;

  // -------------------------------------------------------------------------
  // World Actions
  // -------------------------------------------------------------------------

  /**
   * Broadcast a message to all players
   */
  broadcast(message: string): Promise<void>;

  /**
   * Set the world time
   */
  setTime(time: number): Promise<void>;

  /**
   * Set the weather
   */
  setWeather(weather: Weather): Promise<void>;

  /**
   * Force save all worlds
   */
  save(): Promise<void>;

  /**
   * Get list of worlds
   */
  getWorlds(): Promise<WorldInfo[]>;

  /**
   * Get world time
   */
  getWorldTime(worldId: string): Promise<WorldTimeInfo>;

  /**
   * Set world time
   */
  setWorldTime(
    worldId: string,
    time: number,
    relative?: boolean,
  ): Promise<WorldTimeInfo>;

  /**
   * Get world weather
   */
  getWorldWeather(worldId: string): Promise<WorldWeatherInfo>;

  /**
   * Set world weather
   */
  setWorldWeather(
    worldId: string,
    weather: Weather,
    duration?: number,
  ): Promise<WorldWeatherInfo>;

  /**
   * Get block at coordinates
   */
  getBlock(
    worldId: string,
    x: number,
    y: number,
    z: number,
  ): Promise<BlockInfo>;

  /**
   * Set block at coordinates
   */
  setBlock(
    worldId: string,
    x: number,
    y: number,
    z: number,
    blockId: string,
    nbt?: string,
  ): Promise<BlockInfo>;

  /**
   * Get whitelist info
   */
  getWhitelist(): Promise<WhitelistInfo>;

  /**
   * Manage whitelist
   */
  manageWhitelist(
    action: WhitelistAction,
    players?: string[],
  ): Promise<WhitelistInfo>;
}

// ============================================================================
// Adapter Configuration
// ============================================================================

export type AdapterType = "console" | "rest";

export interface ConsoleAdapterConfig {
  type: "console";
  /** Docker container name or ID for the Hytale server */
  containerName: string;
  /** Path to the shared state directory */
  stateDir: string;
  /** Hytale server hostname for HyQuery */
  serverHost: string;
  /** Hytale server port for HyQuery (default: 5520) */
  serverPort: number;
}

export interface RestAdapterConfig {
  type: "rest";
  /** Base URL for the REST API (e.g., http://hytale:8080) */
  baseUrl: string;
  /** Client ID for JWT authentication */
  clientId: string;
  /** Client secret for JWT authentication (plaintext) */
  clientSecret: string;
  /** Docker container name (for start/restart operations) */
  containerName: string;
}

export type AdapterConfig = ConsoleAdapterConfig | RestAdapterConfig;
