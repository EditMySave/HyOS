/**
 * REST Adapter
 * 
 * Communicates with the Hytale server via the hytale-api REST plugin.
 * Provides full control capabilities including:
 * - Server status and metrics
 * - Player management with positions and stats
 * - World management (time, weather, etc.)
 * - Command execution
 * - WebSocket for real-time events (future)
 */

import type {
  ServerAdapter,
  ServerStatus,
  Player,
  VersionInfo,
  AuthState,
  CommandResult,
  Weather,
  RestAdapterConfig,
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
  InventorySection,
  AdminActionResult,
} from '../types';

// Import Docker utilities for container control (API can't start/restart containers)
// Note: Docker operations may fail if Docker socket is not accessible
import {
  startContainer,
  stopContainer,
  restartContainer,
  getContainerStatus,
} from '../console/docker';

/**
 * Check if the API server is reachable (no auth required)
 */
async function checkApiHealth(baseUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

// Response types matching openapi.yaml
interface ApiStatusResponse {
  name: string;
  motd: string;
  playerCount: number;
  maxPlayers: number;
  uptime: number;
  memory: {
    used: number;
    max: number;
    free: number;
  };
  online: boolean;
}

interface ApiPlayersResponse {
  count: number;
  players: Array<{
    uuid: string;
    name: string;
    world: string;
    position: { x: number; y: number; z: number };
    connectedAt: number;
  }>;
}

interface ApiCommandResponse {
  success: boolean;
  output: string;
}

export class RestAdapter implements ServerAdapter {
  private config: RestAdapterConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;
  
  constructor(config: RestAdapterConfig) {
    this.config = config;
  }
  
  // ===========================================================================
  // Authentication
  // ===========================================================================
  
  /**
   * Get a valid access token, refreshing if needed
   */
  private async getToken(): Promise<string> {
    // Return cached token if still valid (with 60s buffer)
    if (this.accessToken && Date.now() < this.tokenExpiresAt - 60000) {
      return this.accessToken;
    }
    
    // Request new token
    // API expects camelCase fields: clientId and secret
    const response = await fetch(`${this.config.baseUrl}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: this.config.clientId,
        secret: this.config.clientSecret,
      }),
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Authentication failed: ${response.status} - ${text}`);
    }
    
    const data: TokenResponse = await response.json();
    
    this.accessToken = data.access_token;
    this.tokenExpiresAt = Date.now() + (data.expires_in * 1000);
    
    return this.accessToken;
  }
  
  /**
   * Make an authenticated API request
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getToken();
    
    const response = await fetch(`${this.config.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`API error ${response.status}: ${text}`);
    }
    
    return response.json();
  }
  
  // ===========================================================================
  // Status & Info
  // ===========================================================================
  
  async getStatus(): Promise<ServerStatus> {
    // First check if API is reachable (doesn't require Docker socket)
    const apiHealthy = await checkApiHealth(this.config.baseUrl);
    
    if (!apiHealthy) {
      // API not reachable - try to check container status via Docker
      // This may fail if Docker socket is not accessible
      try {
        const containerStatus = await getContainerStatus(this.config.containerName);
        return {
          online: false,
          name: '',
          motd: '',
          version: '',
          playerCount: 0,
          maxPlayers: 0,
          uptime: null,
          memory: null,
          state: containerStatus.running ? 'starting' : 'stopped',
        };
      } catch {
        // Can't access Docker either - return unknown state
        return {
          online: false,
          name: '',
          motd: '',
          version: '',
          playerCount: 0,
          maxPlayers: 0,
          uptime: null,
          memory: null,
          state: 'unknown',
        };
      }
    }
    
    // API is healthy - get detailed status
    try {
      const data = await this.apiRequest<ApiStatusResponse>('/server/status');
      
      return {
        online: data.online,
        name: data.name,
        motd: data.motd || '',
        version: '', // Version is from separate endpoint
        playerCount: data.playerCount,
        maxPlayers: data.maxPlayers,
        uptime: data.uptime,
        memory: data.memory ? {
          used: data.memory.used,
          max: data.memory.max,
          free: data.memory.free,
        } : null,
        state: 'running',
      };
    } catch (error) {
      // API health passed but status call failed - auth issue?
      console.error('REST API status failed:', error);
      return {
        online: true,
        name: '',
        motd: '',
        version: '',
        playerCount: 0,
        maxPlayers: 0,
        uptime: null,
        memory: null,
        state: 'running',
      };
    }
  }
  
  async getPlayers(): Promise<Player[]> {
    try {
      const data = await this.apiRequest<ApiPlayersResponse>('/players');
      
      return data.players.map((p) => ({
        uuid: p.uuid,
        name: p.name,
        world: p.world,
        position: p.position,
        connectedAt: p.connectedAt,
      }));
    } catch (error) {
      console.error('Failed to get players:', error);
      return [];
    }
  }
  
  async getVersion(): Promise<VersionInfo> {
    try {
      const data = await this.apiRequest<{
        gameVersion: string;
        revisionId: string;
        patchline: string;
        protocolVersion: number;
        protocolHash: string;
        pluginVersion: string;
      }>('/server/version');
      
      return {
        gameVersion: data.gameVersion,
        revisionId: data.revisionId,
        patchline: data.patchline,
        protocolVersion: data.protocolVersion,
      };
    } catch (error) {
      console.error('Failed to get version:', error);
      return {
        gameVersion: 'unknown',
        revisionId: '',
        patchline: 'unknown',
        protocolVersion: 0,
      };
    }
  }
  
  async getAuthState(): Promise<AuthState> {
    // The REST API itself doesn't provide server auth state
    // This would need to come from state files or a custom endpoint
    return {
      authenticated: true, // If we can call the API, auth works
      username: null,
      uuid: null,
      lastRefresh: null,
      expiresAt: null,
    };
  }
  
  // ===========================================================================
  // Server Control (via Docker)
  // ===========================================================================
  
  async start(): Promise<void> {
    await startContainer(this.config.containerName);
  }
  
  async stop(): Promise<void> {
    // Send stop command first for graceful shutdown
    try {
      await this.executeCommand('stop');
      // Wait for server to save
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } catch {
      // If API is not available, just stop the container
    }
    await stopContainer(this.config.containerName, 30);
  }
  
  async restart(): Promise<void> {
    // Use Docker to restart the container
    await restartContainer(this.config.containerName, 30);
  }
  
  // ===========================================================================
  // Commands
  // ===========================================================================
  
  async executeCommand(command: string): Promise<CommandResult> {
    try {
      const data = await this.apiRequest<ApiCommandResponse>('/admin/command', {
        method: 'POST',
        body: JSON.stringify({ command }),
      });
      
      return {
        success: data.success,
        output: data.output,
      };
    } catch (error) {
      return {
        success: false,
        output: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  // ===========================================================================
  // Player Actions
  // ===========================================================================
  
  async kickPlayer(uuid: string, reason?: string): Promise<void> {
    await this.apiRequest('/admin/kick', {
      method: 'POST',
      body: JSON.stringify({ player: uuid, reason: reason || 'Kicked by admin' }),
    });
  }
  
  async banPlayer(uuid: string, reason?: string, duration?: number): Promise<void> {
    await this.apiRequest('/admin/ban', {
      method: 'POST',
      body: JSON.stringify({
        player: uuid,
        reason: reason || 'Banned by admin',
        duration: duration,
        permanent: duration === undefined,
      }),
    });
  }
  
  async unbanPlayer(uuid: string): Promise<void> {
    // The API might not have an unban endpoint, use command
    await this.executeCommand(`unban ${uuid}`);
  }
  
  async sendMessage(uuid: string, message: string): Promise<void> {
    await this.apiRequest(`/players/${uuid}/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  
  async teleportPlayer(uuid: string, x: number, y: number, z: number): Promise<void> {
    await this.apiRequest(`/players/${uuid}/teleport`, {
      method: 'POST',
      body: JSON.stringify({ x, y, z }),
    });
  }
  
  async giveItem(uuid: string, itemId: string, amount: number, slot?: string): Promise<void> {
    await this.apiRequest(`/players/${uuid}/inventory/give`, {
      method: 'POST',
      body: JSON.stringify({ itemId, amount, slot: slot || null }),
    });
  }
  
  async clearInventory(uuid: string, section?: InventorySection): Promise<void> {
    await this.apiRequest(`/players/${uuid}/inventory/clear`, {
      method: 'POST',
      body: JSON.stringify({ section: section || null }),
    });
  }
  
  async getGameMode(uuid: string): Promise<GameModeInfo> {
    return this.apiRequest<GameModeInfo>(`/players/${uuid}/gamemode`);
  }
  
  async setGameMode(uuid: string, gameMode: string): Promise<GameModeInfo> {
    return this.apiRequest<GameModeInfo>(`/players/${uuid}/gamemode`, {
      method: 'POST',
      body: JSON.stringify({ gameMode }),
    });
  }
  
  async getPermissions(uuid: string): Promise<PermissionsInfo> {
    return this.apiRequest<PermissionsInfo>(`/players/${uuid}/permissions`);
  }
  
  async grantPermission(uuid: string, permission: string): Promise<PermissionsInfo> {
    return this.apiRequest<PermissionsInfo>(`/players/${uuid}/permissions`, {
      method: 'POST',
      body: JSON.stringify({ permission }),
    });
  }
  
  async revokePermission(uuid: string, permission: string): Promise<PermissionsInfo> {
    return this.apiRequest<PermissionsInfo>(`/players/${uuid}/permissions/${encodeURIComponent(permission)}`, {
      method: 'DELETE',
    });
  }
  
  async getGroups(uuid: string): Promise<GroupsInfo> {
    return this.apiRequest<GroupsInfo>(`/players/${uuid}/groups`);
  }
  
  async addToGroup(uuid: string, group: string): Promise<GroupsInfo> {
    return this.apiRequest<GroupsInfo>(`/players/${uuid}/groups`, {
      method: 'POST',
      body: JSON.stringify({ group }),
    });
  }
  
  async mutePlayer(uuid: string, durationMinutes?: number, reason?: string): Promise<MuteInfo> {
    return this.apiRequest<MuteInfo>(`/chat/mute/${uuid}`, {
      method: 'POST',
      body: JSON.stringify({
        durationMinutes: durationMinutes || null,
        reason: reason || null,
      }),
    });
  }
  
  async teleportPlayerFull(uuid: string, options: {
    x?: number;
    y?: number;
    z?: number;
    world?: string;
    yaw?: number;
    pitch?: number;
  }): Promise<TeleportResult> {
    return this.apiRequest<TeleportResult>(`/players/${uuid}/teleport`, {
      method: 'POST',
      body: JSON.stringify({
        x: options.x ?? null,
        y: options.y ?? null,
        z: options.z ?? null,
        world: options.world ?? null,
        yaw: options.yaw ?? null,
        pitch: options.pitch ?? null,
      }),
    });
  }
  
  async getPlayerLocation(uuid: string): Promise<PlayerLocation> {
    return this.apiRequest<PlayerLocation>(`/players/${uuid}/location`);
  }
  
  async getPlayerStats(uuid: string): Promise<PlayerStats> {
    return this.apiRequest<PlayerStats>(`/players/${uuid}/stats`);
  }
  
  // ===========================================================================
  // World Actions
  // ===========================================================================
  
  async broadcast(message: string): Promise<void> {
    await this.apiRequest('/admin/broadcast', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }
  
  async getWorlds(): Promise<WorldInfo[]> {
    const data = await this.apiRequest<{ count: number; worlds: WorldInfo[] }>('/worlds');
    return data.worlds;
  }
  
  async setTime(time: number): Promise<void> {
    const worlds = await this.getWorlds();
    
    if (worlds.length > 0) {
      const worldId = worlds[0].uuid;
      await this.apiRequest(`/worlds/${worldId}/time`, {
        method: 'POST',
        body: JSON.stringify({ time }),
      });
    } else {
      await this.executeCommand(`time set ${time}`);
    }
  }
  
  async setWeather(weather: Weather): Promise<void> {
    const worlds = await this.getWorlds();
    
    if (worlds.length > 0) {
      const worldId = worlds[0].uuid;
      await this.apiRequest(`/worlds/${worldId}/weather`, {
        method: 'POST',
        body: JSON.stringify({ weather }),
      });
    } else {
      await this.executeCommand(`weather ${weather}`);
    }
  }
  
  async getWorldTime(worldId: string): Promise<WorldTimeInfo> {
    return this.apiRequest<WorldTimeInfo>(`/worlds/${worldId}/time`);
  }
  
  async setWorldTime(worldId: string, time: number, relative?: boolean): Promise<WorldTimeInfo> {
    return this.apiRequest<WorldTimeInfo>(`/worlds/${worldId}/time`, {
      method: 'POST',
      body: JSON.stringify({ time, relative: relative || null }),
    });
  }
  
  async getWorldWeather(worldId: string): Promise<WorldWeatherInfo> {
    return this.apiRequest<WorldWeatherInfo>(`/worlds/${worldId}/weather`);
  }
  
  async setWorldWeather(worldId: string, weather: Weather, duration?: number): Promise<WorldWeatherInfo> {
    return this.apiRequest<WorldWeatherInfo>(`/worlds/${worldId}/weather`, {
      method: 'POST',
      body: JSON.stringify({ weather, duration: duration || null }),
    });
  }
  
  async getBlock(worldId: string, x: number, y: number, z: number): Promise<BlockInfo> {
    return this.apiRequest<BlockInfo>(`/worlds/${worldId}/blocks/${x}/${y}/${z}`);
  }
  
  async setBlock(worldId: string, x: number, y: number, z: number, blockId: string, nbt?: string): Promise<BlockInfo> {
    return this.apiRequest<BlockInfo>(`/worlds/${worldId}/blocks/${x}/${y}/${z}`, {
      method: 'POST',
      body: JSON.stringify({ blockId, nbt: nbt || null }),
    });
  }
  
  async save(): Promise<void> {
    await this.apiRequest('/server/save', {
      method: 'POST',
    });
  }
  
  // ===========================================================================
  // Whitelist Management
  // ===========================================================================
  
  async getWhitelist(): Promise<WhitelistInfo> {
    // The API doesn't have a GET whitelist endpoint, so we'll use a dummy action
    // that returns current state, or fall back to a default
    try {
      return await this.apiRequest<WhitelistInfo>('/server/whitelist', {
        method: 'POST',
        body: JSON.stringify({ action: 'enable' }), // This returns current state
      });
    } catch {
      return { enabled: false, playerCount: 0, players: [] };
    }
  }
  
  async manageWhitelist(action: WhitelistAction, players?: string[]): Promise<WhitelistInfo> {
    return this.apiRequest<WhitelistInfo>('/server/whitelist', {
      method: 'POST',
      body: JSON.stringify({ action, players: players || null }),
    });
  }
}
