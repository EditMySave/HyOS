/**
 * Console Adapter (Docker-only fallback)
 *
 * Implements ServerAdapter using:
 * - Docker exec for command execution and container control
 * - State files for server information
 *
 * NOTE: This adapter has LIMITED functionality without the REST API plugin.
 * Player counts and lists are NOT available. Use the REST adapter for full features.
 */

import type {
  ServerAdapter,
  ServerStatus,
  Player,
  VersionInfo,
  AuthState,
  CommandResult,
  Weather,
  ConsoleAdapterConfig,
  InventorySection,
  GameModeInfo,
  PermissionsInfo,
  GroupsInfo,
  MuteInfo,
  TeleportResult,
  PlayerLocation,
  PlayerStats,
  WorldInfo,
  WorldTimeInfo,
  WorldWeatherInfo,
  BlockInfo,
  WhitelistInfo,
  WhitelistAction,
} from "../types";

import {
  executeInContainer,
  executeScript,
  getContainerStatus,
  startContainer,
  stopContainer,
  restartContainer,
} from "./docker";
import { StateReader } from "./state-reader";

export class ConsoleAdapter implements ServerAdapter {
  private config: ConsoleAdapterConfig;
  private stateReader: StateReader;

  constructor(config: ConsoleAdapterConfig) {
    this.config = config;
    this.stateReader = new StateReader(config.stateDir);
  }

  // ===========================================================================
  // Status & Info
  // ===========================================================================

  async getStatus(): Promise<ServerStatus> {
    // Get container status first
    const containerStatus = await getContainerStatus(this.config.containerName);

    if (!containerStatus.running) {
      return {
        online: false,
        name: "",
        motd: "",
        version: "",
        playerCount: 0,
        maxPlayers: 0,
        uptime: null,
        memory: null,
        state: "stopped",
      };
    }

    // Use state files for server info
    const stateStatus = await this.stateReader.getServerStatus();
    const versionState = await this.stateReader.getVersionState();

    return {
      online: stateStatus.state === "running",
      name: stateStatus.serverName,
      motd: stateStatus.motd,
      version: versionState?.version || "",
      // NOTE: Player count not available without REST API plugin
      playerCount: 0,
      maxPlayers: stateStatus.maxPlayers,
      uptime: stateStatus.uptime,
      memory: stateStatus.memory,
      state: stateStatus.state,
    };
  }

  async getPlayers(): Promise<Player[]> {
    // Player list not available without REST API plugin
    // Return empty array - UI should indicate REST adapter is needed
    return [];
  }

  async getVersion(): Promise<VersionInfo> {
    const versionState = await this.stateReader.getVersionState();

    if (versionState) {
      return {
        gameVersion: versionState.version || "unknown",
        revisionId: versionState.revision || "",
        patchline: versionState.patchline || "unknown",
        protocolVersion: versionState.protocol_version || 0,
      };
    }

    return {
      gameVersion: "unknown",
      revisionId: "",
      patchline: "unknown",
      protocolVersion: 0,
    };
  }

  async getAuthState(): Promise<AuthState> {
    return this.stateReader.getAuthStatus();
  }

  // ===========================================================================
  // Server Control
  // ===========================================================================

  async start(): Promise<void> {
    await startContainer(this.config.containerName);
  }

  async stop(): Promise<void> {
    // Send stop command first for graceful shutdown
    await this.executeCommand("stop");

    // Wait a bit for the server to save
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Stop the container
    await stopContainer(this.config.containerName, 30);
  }

  async restart(): Promise<void> {
    await restartContainer(this.config.containerName, 30);
  }

  // ===========================================================================
  // Commands
  // ===========================================================================

  async executeCommand(command: string): Promise<CommandResult> {
    // Use the cmd/exec.sh script if available, otherwise direct exec
    const result = await executeScript(
      this.config.containerName,
      "/opt/scripts/cmd/exec.sh",
      [command],
    );

    // If exec.sh doesn't exist, fall back to direct stdin
    if (
      result.error?.includes("not found") ||
      result.error?.includes("No such file")
    ) {
      return executeInContainer(this.config.containerName, command);
    }

    return result;
  }

  // ===========================================================================
  // Player Actions
  // ===========================================================================

  async kickPlayer(uuid: string, reason?: string): Promise<void> {
    const cmd = reason ? `kick ${uuid} ${reason}` : `kick ${uuid}`;
    await this.executeCommand(cmd);
  }

  async banPlayer(
    uuid: string,
    reason?: string,
    duration?: number,
  ): Promise<void> {
    let cmd = `ban ${uuid}`;
    if (duration) {
      cmd += ` ${duration}`;
    }
    if (reason) {
      cmd += ` ${reason}`;
    }
    await this.executeCommand(cmd);
  }

  async unbanPlayer(uuid: string): Promise<void> {
    await this.executeCommand(`unban ${uuid}`);
  }

  async sendMessage(uuid: string, message: string): Promise<void> {
    await this.executeCommand(`msg ${uuid} ${message}`);
  }

  async teleportPlayer(
    uuid: string,
    x: number,
    y: number,
    z: number,
  ): Promise<void> {
    await this.executeCommand(`tp ${uuid} ${x} ${y} ${z}`);
  }

  async giveItem(
    uuid: string,
    itemId: string,
    amount: number,
    _slot?: string,
  ): Promise<void> {
    await this.executeCommand(`give ${uuid} ${itemId} ${amount}`);
  }

  async clearInventory(
    _uuid: string,
    _section?: InventorySection,
  ): Promise<void> {
    throw new Error("clearInventory requires REST adapter");
  }

  async getGameMode(_uuid: string): Promise<GameModeInfo> {
    throw new Error("getGameMode requires REST adapter");
  }

  async setGameMode(_uuid: string, _gameMode: string): Promise<GameModeInfo> {
    throw new Error("setGameMode requires REST adapter");
  }

  async getPermissions(_uuid: string): Promise<PermissionsInfo> {
    throw new Error("getPermissions requires REST adapter");
  }

  async grantPermission(
    _uuid: string,
    _permission: string,
  ): Promise<PermissionsInfo> {
    throw new Error("grantPermission requires REST adapter");
  }

  async revokePermission(
    _uuid: string,
    _permission: string,
  ): Promise<PermissionsInfo> {
    throw new Error("revokePermission requires REST adapter");
  }

  async getGroups(_uuid: string): Promise<GroupsInfo> {
    throw new Error("getGroups requires REST adapter");
  }

  async addToGroup(_uuid: string, _group: string): Promise<GroupsInfo> {
    throw new Error("addToGroup requires REST adapter");
  }

  async mutePlayer(
    _uuid: string,
    _durationMinutes?: number,
    _reason?: string,
  ): Promise<MuteInfo> {
    throw new Error("mutePlayer requires REST adapter");
  }

  async teleportPlayerFull(
    _uuid: string,
    _options: {
      x?: number;
      y?: number;
      z?: number;
      world?: string;
      yaw?: number;
      pitch?: number;
    },
  ): Promise<TeleportResult> {
    throw new Error("teleportPlayerFull requires REST adapter");
  }

  async getPlayerLocation(_uuid: string): Promise<PlayerLocation> {
    throw new Error("getPlayerLocation requires REST adapter");
  }

  async getPlayerStats(_uuid: string): Promise<PlayerStats> {
    throw new Error("getPlayerStats requires REST adapter");
  }

  // ===========================================================================
  // World Actions
  // ===========================================================================

  async broadcast(message: string): Promise<void> {
    await this.executeCommand(`say ${message}`);
  }

  async setTime(time: number): Promise<void> {
    await this.executeCommand(`time set ${time}`);
  }

  async setWeather(weather: Weather): Promise<void> {
    await this.executeCommand(`weather ${weather}`);
  }

  async save(): Promise<void> {
    await this.executeCommand("save-all");
  }

  async getWorlds(): Promise<WorldInfo[]> {
    throw new Error("getWorlds requires REST adapter");
  }

  async getWorldTime(_worldId: string): Promise<WorldTimeInfo> {
    throw new Error("getWorldTime requires REST adapter");
  }

  async setWorldTime(
    _worldId: string,
    _time: number,
    _relative?: boolean,
  ): Promise<WorldTimeInfo> {
    throw new Error("setWorldTime requires REST adapter");
  }

  async getWorldWeather(_worldId: string): Promise<WorldWeatherInfo> {
    throw new Error("getWorldWeather requires REST adapter");
  }

  async setWorldWeather(
    _worldId: string,
    _weather: Weather,
    _duration?: number,
  ): Promise<WorldWeatherInfo> {
    throw new Error("setWorldWeather requires REST adapter");
  }

  async getBlock(
    _worldId: string,
    _x: number,
    _y: number,
    _z: number,
  ): Promise<BlockInfo> {
    throw new Error("getBlock requires REST adapter");
  }

  async setBlock(
    _worldId: string,
    _x: number,
    _y: number,
    _z: number,
    _blockId: string,
    _nbt?: string,
  ): Promise<BlockInfo> {
    throw new Error("setBlock requires REST adapter");
  }

  async getWhitelist(): Promise<WhitelistInfo> {
    throw new Error("getWhitelist requires REST adapter");
  }

  async manageWhitelist(
    _action: WhitelistAction,
    _players?: string[],
  ): Promise<WhitelistInfo> {
    throw new Error("manageWhitelist requires REST adapter");
  }
}
