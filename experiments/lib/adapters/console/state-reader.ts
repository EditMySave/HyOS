/**
 * State File Reader
 *
 * Reads the JSON state files written by the Hytale server container.
 * These files are located in /data/.state/ and provide detailed
 * status information that complements HyQuery.
 *
 * State files:
 * - server.json: Server state (starting, running, stopped, etc.)
 * - auth.json: Authentication status
 * - version.json: Version information
 * - config.json: Current configuration
 * - health.json: Health check results
 */

import { promises as fs } from "fs";
import * as path from "path";
import type { ServerState, AuthState, VersionInfo, MemoryInfo } from "../types";

// ============================================================================
// State File Types (matching config-truenas/scripts/lib/state.sh)
// ============================================================================

export interface ServerStateFile {
  status: ServerState;
  pid?: number;
  started_at?: string;
  error?: string;
  updated_at: string;
}

export interface AuthStateFile {
  status: string;
  authenticated: boolean;
  profile?: string;
  expires_at?: string;
  error?: string;
  updated_at: string;
}

export interface VersionStateFile {
  version?: string;
  revision?: string;
  patchline?: string;
  protocol_version?: number;
  downloaded_at?: string;
  updated_at: string;
}

export interface ConfigStateFile {
  config: {
    server_name: string;
    motd: string;
    max_players: number;
    max_view_radius?: number;
    default_world?: string;
    default_gamemode?: string;
    whitelist_enabled: boolean;
    local_compression?: boolean;
    has_password?: boolean;
  };
  updated_at: string;
}

export interface HealthStateFile {
  healthy: boolean;
  server_running: boolean;
  port_bound: boolean;
  last_log_activity?: string;
  memory_used?: number;
  memory_max?: number;
  updated_at: string;
}

// ============================================================================
// State Reader Class
// ============================================================================

export class StateReader {
  private stateDir: string;

  constructor(stateDir: string) {
    this.stateDir = stateDir;
  }

  /**
   * Read and parse a JSON state file
   */
  private async readStateFile<T>(filename: string): Promise<T | null> {
    const filePath = path.join(this.stateDir, filename);

    try {
      const content = await fs.readFile(filePath, "utf8");
      return JSON.parse(content) as T;
    } catch (error) {
      // File doesn't exist or is invalid
      return null;
    }
  }

  /**
   * Get server state
   */
  async getServerState(): Promise<ServerStateFile | null> {
    return this.readStateFile<ServerStateFile>("server.json");
  }

  /**
   * Get authentication state
   */
  async getAuthState(): Promise<AuthStateFile | null> {
    return this.readStateFile<AuthStateFile>("auth.json");
  }

  /**
   * Get version information
   */
  async getVersionState(): Promise<VersionStateFile | null> {
    return this.readStateFile<VersionStateFile>("version.json");
  }

  /**
   * Get configuration
   */
  async getConfigState(): Promise<ConfigStateFile | null> {
    return this.readStateFile<ConfigStateFile>("config.json");
  }

  /**
   * Get health check results
   */
  async getHealthState(): Promise<HealthStateFile | null> {
    return this.readStateFile<HealthStateFile>("health.json");
  }

  /**
   * Get all state files combined
   */
  async getAllState(): Promise<{
    server: ServerStateFile | null;
    auth: AuthStateFile | null;
    version: VersionStateFile | null;
    config: ConfigStateFile | null;
    health: HealthStateFile | null;
  }> {
    const [server, auth, version, config, health] = await Promise.all([
      this.getServerState(),
      this.getAuthState(),
      this.getVersionState(),
      this.getConfigState(),
      this.getHealthState(),
    ]);

    return { server, auth, version, config, health };
  }

  /**
   * Check if state directory exists and is readable
   */
  async isAvailable(): Promise<boolean> {
    try {
      await fs.access(this.stateDir, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Convert state files to adapter types
   */
  async getServerStatus(): Promise<{
    state: ServerState;
    uptime: number | null;
    memory: MemoryInfo | null;
    serverName: string;
    motd: string;
    maxPlayers: number;
  }> {
    const [serverState, healthState, configState] = await Promise.all([
      this.getServerState(),
      this.getHealthState(),
      this.getConfigState(),
    ]);

    let uptime: number | null = null;
    if (serverState?.started_at) {
      const startedAt = new Date(serverState.started_at).getTime();
      uptime = Date.now() - startedAt;
    }

    let memory: MemoryInfo | null = null;
    if (healthState?.memory_used && healthState?.memory_max) {
      memory = {
        used: healthState.memory_used,
        max: healthState.memory_max,
        free: healthState.memory_max - healthState.memory_used,
      };
    }

    return {
      state: serverState?.status || "unknown",
      uptime,
      memory,
      serverName: configState?.config?.server_name || "",
      motd: configState?.config?.motd || "",
      maxPlayers: configState?.config?.max_players || 0,
    };
  }

  async getAuthStatus(): Promise<AuthState> {
    const authState = await this.getAuthState();

    return {
      authenticated: authState?.authenticated || false,
      username: authState?.profile || null,
      uuid: null, // Not stored in current format
      lastRefresh: authState?.updated_at || null,
      expiresAt: authState?.expires_at || null,
    };
  }

  async getVersionInfo(): Promise<VersionInfo | null> {
    const versionState = await this.getVersionState();

    if (!versionState) {
      return null;
    }

    return {
      gameVersion: versionState.version || "unknown",
      revisionId: versionState.revision || "",
      patchline: versionState.patchline || "release",
      protocolVersion: versionState.protocol_version || 0,
    };
  }
}
