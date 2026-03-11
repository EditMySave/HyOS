"use client";

import { useEffect } from "react";
import { useNotificationsStore } from "@/lib/stores/notifications.store";
import {
  useAuthState,
  useHealthState,
  useServerStatus,
  useUpdateStatus,
} from "@/lib/services/server";
import { useInstalledMods, useLoadedPlugins } from "@/lib/services/mods";
import type { AppNotification } from "@/lib/types/notifications.types";

export function useNotificationSyncer() {
  const sync = useNotificationsStore((s) => s.sync);

  const { data: updateStatus } = useUpdateStatus();
  const { data: healthState } = useHealthState();
  const { data: authState } = useAuthState();
  const { data: serverStatus } = useServerStatus();
  const { data: loadedPlugins } = useLoadedPlugins();
  const { data: installedMods } = useInstalledMods();

  useEffect(() => {
    const next: AppNotification[] = [];

    // Update available
    if (updateStatus?.needsUpdate) {
      next.push({
        id: "update-available",
        type: "update-available",
        severity: "info",
        title: "Update Available",
        message: `Version ${updateStatus.latestVersion} is available (current: ${updateStatus.currentVersion})`,
        actions: [
          { label: "Update Now", kind: "mutation", target: "schedule-update" },
        ],
      });
    }

    // Low RAM / health warnings
    if (healthState?.checks) {
      for (const check of healthState.checks) {
        if (check.status === "warn") {
          next.push({
            id: `low-ram-${check.name}`,
            type: "low-ram",
            severity: "warning",
            title: "Server Warning",
            message: check.message,
            actions: [
              { label: "View Dashboard", kind: "link", target: "/" },
            ],
          });
        }
      }
    }

    // Auth expired / failed
    if (
      authState?.status === "timeout" ||
      authState?.status === "failed"
    ) {
      next.push({
        id: "auth-expired",
        type: "auth-expired",
        severity: "error",
        title: "Authentication Expired",
        message:
          authState.status === "timeout"
            ? "Device code has expired. Restart the server to get a new code."
            : "Authentication failed. Restart the server to try again.",
        actions: [
          { label: "Restart Server", kind: "mutation", target: "restart-server" },
        ],
      });
    }

    // Server crashed
    if (serverStatus?.state === "crashed") {
      next.push({
        id: "server-crashed",
        type: "server-crashed",
        severity: "error",
        title: "Server Crashed",
        message: "The server has crashed unexpectedly.",
        actions: [
          { label: "View Logs", kind: "link", target: "/logs" },
          { label: "Restart", kind: "mutation", target: "restart-server" },
        ],
      });
    }

    // Mod load failures — loaded plugins with ERROR state
    const errorPlugins = loadedPlugins?.plugins.filter(
      (p) => p.state === "ERROR",
    );
    if (errorPlugins) {
      for (const plugin of errorPlugins) {
        next.push({
          id: `mod-load-failure-plugin-${plugin.name}`,
          type: "mod-load-failure",
          severity: "error",
          title: "Mod Failed to Load",
          message: `Plugin "${plugin.name}" failed to load.`,
          actions: [{ label: "View Mods", kind: "link", target: "/mods" }],
        });
      }
    }

    // Mod load failures — installed mods with crashed disableReason
    const crashedMods = installedMods?.mods.filter(
      (m) => m.disableReason === "crashed",
    );
    if (crashedMods) {
      for (const mod of crashedMods) {
        // Deduplicate: skip if a plugin error with the same name already exists
        const alreadyReported = errorPlugins?.some(
          (p) => p.name === mod.displayName,
        );
        if (!alreadyReported) {
          next.push({
            id: `mod-load-failure-mod-${mod.id}`,
            type: "mod-load-failure",
            severity: "error",
            title: "Mod Crashed",
            message: `Mod "${mod.displayName}" was disabled due to a crash.`,
            actions: [{ label: "View Mods", kind: "link", target: "/mods" }],
          });
        }
      }
    }

    sync(next);
  }, [
    updateStatus,
    healthState,
    authState,
    serverStatus,
    loadedPlugins,
    installedMods,
    sync,
  ]);
}
