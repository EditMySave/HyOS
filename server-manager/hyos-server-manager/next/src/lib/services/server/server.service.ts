import {
  serverStatusSchema,
  versionInfoSchema,
  authStateSchema,
  commandResultSchema,
  whitelistInfoSchema,
  updateCheckResultSchema,
  scheduledUpdateStatusSchema,
  type ServerStatus,
  type VersionInfo,
  type AuthState,
  type CommandResult,
  type WhitelistInfo,
  type WhitelistAction,
  type UpdateCheckResult,
  type ScheduledUpdateStatus,
} from "./server.types";

/**
 * Get current server status
 */
export async function getServerStatus(): Promise<ServerStatus> {
  const response = await fetch("/api/server/status");
  if (!response.ok) {
    throw new Error(`Failed to fetch server status: ${response.statusText}`);
  }
  const data = await response.json();
  return serverStatusSchema.parse(data);
}

/**
 * Get server version information
 */
export async function getServerVersion(): Promise<VersionInfo> {
  const response = await fetch("/api/server/version");
  if (!response.ok) {
    throw new Error(`Failed to fetch server version: ${response.statusText}`);
  }
  const data = await response.json();
  return versionInfoSchema.parse(data);
}

/**
 * Get authentication state
 */
export async function getAuthState(): Promise<AuthState> {
  const response = await fetch("/api/server/auth");
  if (!response.ok) {
    throw new Error(`Failed to fetch auth state: ${response.statusText}`);
  }
  const data = await response.json();
  return authStateSchema.parse(data);
}

/**
 * Execute a server command
 */
export async function executeCommand(command: string): Promise<CommandResult> {
  const response = await fetch("/api/server/command", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ command }),
  });
  if (!response.ok) {
    throw new Error(`Failed to execute command: ${response.statusText}`);
  }
  const data = await response.json();
  return commandResultSchema.parse(data);
}

/**
 * Start the server
 */
export async function startServer(): Promise<void> {
  const response = await fetch("/api/server/start", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to start server: ${response.statusText}`);
  }
}

/**
 * Stop the server
 */
export async function stopServer(): Promise<void> {
  const response = await fetch("/api/server/stop", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to stop server: ${response.statusText}`);
  }
}

/**
 * Restart the server
 */
export async function restartServer(): Promise<void> {
  const response = await fetch("/api/server/restart", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to restart server: ${response.statusText}`);
  }
}

/**
 * Get whitelist information
 */
export async function getWhitelist(): Promise<WhitelistInfo> {
  const response = await fetch("/api/server/whitelist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "enable" }),
  });
  if (!response.ok) {
    throw new Error(`Failed to get whitelist: ${response.statusText}`);
  }
  const data = await response.json();
  return whitelistInfoSchema.parse(data);
}

/**
 * Manage whitelist (add, remove, enable, disable)
 */
export async function manageWhitelist(
  action: WhitelistAction,
  players?: string[],
): Promise<WhitelistInfo> {
  const response = await fetch("/api/server/whitelist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, players: players || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to manage whitelist: ${response.statusText}`);
  }
  const data = await response.json();
  return whitelistInfoSchema.parse(data);
}

/**
 * Get update status
 */
export async function getUpdateStatus(): Promise<UpdateCheckResult> {
  const response = await fetch("/api/server/update");
  if (!response.ok) {
    throw new Error(`Failed to get update status: ${response.statusText}`);
  }
  const data = await response.json();
  return updateCheckResultSchema.parse(data);
}

/**
 * Check for updates (triggers actual check)
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const response = await fetch("/api/server/update", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to check for updates: ${response.statusText}`);
  }
  const data = await response.json();
  return updateCheckResultSchema.parse(data);
}

/**
 * Get scheduled update status
 */
export async function getScheduledUpdate(): Promise<ScheduledUpdateStatus> {
  const response = await fetch("/api/server/schedule-update");
  if (!response.ok) {
    throw new Error(
      `Failed to get scheduled update status: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return scheduledUpdateStatusSchema.parse(data);
}

/**
 * Schedule update for next restart
 */
export async function scheduleUpdate(): Promise<ScheduledUpdateStatus> {
  const response = await fetch("/api/server/schedule-update", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to schedule update: ${response.statusText}`);
  }
  const data = await response.json();
  return scheduledUpdateStatusSchema.parse(data);
}

/**
 * Cancel scheduled update
 */
export async function cancelScheduledUpdate(): Promise<ScheduledUpdateStatus> {
  const response = await fetch("/api/server/schedule-update", {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Failed to cancel scheduled update: ${response.statusText}`);
  }
  const data = await response.json();
  return scheduledUpdateStatusSchema.parse(data);
}
