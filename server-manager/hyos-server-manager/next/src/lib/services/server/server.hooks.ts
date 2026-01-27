import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  getServerStatus,
  getServerVersion,
  getAuthState,
  executeCommand,
  startServer,
  stopServer,
  restartServer,
  getWhitelist,
  manageWhitelist,
  getUpdateStatus,
  checkForUpdates,
} from "./server.service";
import type {
  ServerStatus,
  VersionInfo,
  AuthState,
  CommandResult,
  WhitelistInfo,
  WhitelistAction,
  UpdateCheckResult,
} from "./server.types";

/**
 * Hook to get server status with auto-refresh
 * Default 15 seconds to avoid rate limiting
 */
export function useServerStatus(refreshInterval = 15000) {
  return useSWR<ServerStatus>("server-status", getServerStatus, {
    refreshInterval,
    dedupingInterval: 5000, // Prevent duplicate requests within 5s
  });
}

/**
 * Hook to get server version
 */
export function useServerVersion() {
  return useSWR<VersionInfo>("server-version", getServerVersion);
}

/**
 * Hook to get authentication state
 * Polls every 5 seconds when auth is pending, otherwise every 30 seconds
 */
export function useAuthState(isPending = false) {
  return useSWR<AuthState>("auth-state", getAuthState, {
    refreshInterval: isPending ? 5000 : 30000,
  });
}

/**
 * Hook to execute a server command
 */
export function useExecuteCommand() {
  return useSWRMutation<CommandResult, Error, string, string>(
    "execute-command",
    async (_, { arg: command }) => executeCommand(command),
  );
}

/**
 * Hook to start the server
 */
export function useStartServer() {
  return useSWRMutation<void, Error, string>("start-server", async () =>
    startServer(),
  );
}

/**
 * Hook to stop the server
 */
export function useStopServer() {
  return useSWRMutation<void, Error, string>("stop-server", async () =>
    stopServer(),
  );
}

/**
 * Hook to restart the server
 */
export function useRestartServer() {
  return useSWRMutation<void, Error, string>("restart-server", async () =>
    restartServer(),
  );
}

/**
 * Hook to get whitelist information
 */
export function useWhitelist() {
  return useSWR<WhitelistInfo>("whitelist", getWhitelist);
}

/**
 * Hook to manage whitelist
 */
export function useManageWhitelist() {
  return useSWRMutation<
    WhitelistInfo,
    Error,
    string,
    { action: WhitelistAction; players?: string[] }
  >("manage-whitelist", async (_, { arg }) =>
    manageWhitelist(arg.action, arg.players),
  );
}

/**
 * Hook to get update status
 */
export function useUpdateStatus() {
  return useSWR<UpdateCheckResult>("update-status", getUpdateStatus, {
    refreshInterval: 60000, // Refresh every minute
  });
}

/**
 * Hook to check for updates
 */
export function useCheckForUpdates() {
  return useSWRMutation<UpdateCheckResult, Error, string>(
    "check-updates",
    async () => checkForUpdates(),
  );
}
