type CommandStatus = "supported" | "not-implemented";

interface CommandSupport {
  status: CommandStatus;
  reason: string;
}

const COMMAND_SUPPORT: Record<string, CommandSupport> = {
  // Hard 501 — throws NotImplemented
  "save-world": {
    status: "not-implemented",
    reason: "Save World endpoint returns 501 — not yet implemented in the Hytale API plugin",
  },
  "manage-whitelist": {
    status: "not-implemented",
    reason: "Whitelist management endpoint returns 501 — not yet implemented in the Hytale API plugin",
  },

  // Fake success — logs but does nothing server-side
  "give-item": {
    status: "not-implemented",
    reason: "Give Item endpoint accepts the request but has no server-side effect yet",
  },
  "clear-inventory": {
    status: "not-implemented",
    reason: "Clear Inventory endpoint accepts the request but has no server-side effect yet",
  },
  "set-game-mode": {
    status: "not-implemented",
    reason: "Set Game Mode endpoint accepts the request but has no server-side effect yet",
  },
  "send-message": {
    status: "not-implemented",
    reason: "Send Private Message endpoint accepts the request but has no server-side effect yet",
  },
  "mute-player": {
    status: "not-implemented",
    reason: "Mute Player endpoint accepts the request but has no server-side effect yet",
  },
  "set-world-time": {
    status: "not-implemented",
    reason: "Set World Time endpoint accepts the request but has no server-side effect yet",
  },
  "set-weather": {
    status: "not-implemented",
    reason: "Set Weather endpoint accepts the request but has no server-side effect yet",
  },
  "set-block": {
    status: "not-implemented",
    reason: "Set Block endpoint accepts the request but has no server-side effect yet",
  },
};

export function getUnsupportedInfo(id: string): CommandSupport | null {
  const entry = COMMAND_SUPPORT[id];
  if (entry && entry.status === "not-implemented") return entry;
  return null;
}

export function isCommandUnsupported(id: string): boolean {
  return getUnsupportedInfo(id) !== null;
}
