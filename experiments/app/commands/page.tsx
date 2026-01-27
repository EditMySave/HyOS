"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// Types
interface Player {
  uuid: string;
  name: string;
  world: string;
}

interface WorldInfo {
  uuid: string;
  name: string;
  playerCount: number;
  type: string;
}

interface WhitelistInfo {
  enabled: boolean;
  playerCount: number;
  players: string[];
}

interface CommandResult {
  success: boolean;
  output?: string;
  message?: string;
  error?: string;
}

// =============================================================================
// Server Commands Page
// =============================================================================
export default function CommandsPage() {
  // State
  const [players, setPlayers] = useState<Player[]>([]);
  const [worlds, setWorlds] = useState<WorldInfo[]>([]);
  const [whitelist, setWhitelist] = useState<WhitelistInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [result, setResult] = useState<CommandResult | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedWorld, setSelectedWorld] = useState<string>("");

  // Form states
  const [kickReason, setKickReason] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [muteReason, setMuteReason] = useState("");
  const [muteDuration, setMuteDuration] = useState("");
  const [teleportX, setTeleportX] = useState("");
  const [teleportY, setTeleportY] = useState("");
  const [teleportZ, setTeleportZ] = useState("");
  const [teleportWorld, setTeleportWorld] = useState("");
  const [gameMode, setGameMode] = useState("survival");
  const [giveItemId, setGiveItemId] = useState("");
  const [giveItemAmount, setGiveItemAmount] = useState("1");
  const [clearSection, setClearSection] = useState("all");
  const [privateMessage, setPrivateMessage] = useState("");
  const [permission, setPermission] = useState("");
  const [groupName, setGroupName] = useState("");
  const [rawCommand, setRawCommand] = useState("");
  const [worldTime, setWorldTime] = useState("");
  const [worldWeather, setWorldWeather] = useState("clear");
  const [blockX, setBlockX] = useState("");
  const [blockY, setBlockY] = useState("");
  const [blockZ, setBlockZ] = useState("");
  const [blockId, setBlockId] = useState("");
  const [whitelistAction, setWhitelistAction] = useState<
    "add" | "remove" | "enable" | "disable"
  >("add");
  const [whitelistPlayers, setWhitelistPlayers] = useState("");

  // Fetch data
  const fetchPlayers = useCallback(async () => {
    try {
      const res = await fetch("/api/server/players");
      const data = await res.json();
      if (data.players) {
        setPlayers(data.players);
        if (data.players.length > 0 && !selectedPlayer) {
          setSelectedPlayer(data.players[0].uuid);
        }
      }
    } catch (e) {
      console.error("Failed to fetch players:", e);
    }
  }, [selectedPlayer]);

  const fetchWorlds = useCallback(async () => {
    try {
      const res = await fetch("/api/world");
      const data = await res.json();
      if (data.worlds) {
        setWorlds(data.worlds);
        if (data.worlds.length > 0 && !selectedWorld) {
          setSelectedWorld(data.worlds[0].uuid);
        }
      }
    } catch (e) {
      console.error("Failed to fetch worlds:", e);
    }
  }, [selectedWorld]);

  const fetchWhitelist = useCallback(async () => {
    try {
      const res = await fetch("/api/server/whitelist");
      const data = await res.json();
      if (!data.error) {
        setWhitelist(data);
      }
    } catch (e) {
      console.error("Failed to fetch whitelist:", e);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchPlayers(), fetchWorlds(), fetchWhitelist()]);
      setLoading(false);
    };
    load();

    const interval = setInterval(fetchPlayers, 10000);
    return () => clearInterval(interval);
  }, [fetchPlayers, fetchWorlds, fetchWhitelist]);

  // Helper to show result
  const showResult = (data: CommandResult) => {
    setResult(data);
    setTimeout(() => setResult(null), 5000);
  };

  // API helpers
  const apiPost = async (url: string, body?: object) => {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.json();
  };

  // ===========================================
  // Admin Actions
  // ===========================================
  const handleKick = async () => {
    if (!selectedPlayer) return;
    setActionLoading("kick");
    const data = await apiPost(`/api/player/${selectedPlayer}/kick`, {
      reason: kickReason || undefined,
    });
    showResult(data);
    setKickReason("");
    fetchPlayers();
    setActionLoading(null);
  };

  const handleBan = async () => {
    if (!selectedPlayer) return;
    setActionLoading("ban");
    const data = await apiPost(`/api/player/${selectedPlayer}/ban`, {
      reason: banReason || undefined,
      durationMinutes: banDuration ? parseInt(banDuration) : undefined,
    });
    showResult(data);
    setBanReason("");
    setBanDuration("");
    fetchPlayers();
    setActionLoading(null);
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage) return;
    setActionLoading("broadcast");
    const data = await apiPost("/api/world/broadcast", {
      message: broadcastMessage,
    });
    showResult(data);
    setBroadcastMessage("");
    setActionLoading(null);
  };

  const handleMute = async () => {
    if (!selectedPlayer) return;
    setActionLoading("mute");
    const data = await apiPost(`/api/player/${selectedPlayer}/mute`, {
      reason: muteReason || undefined,
      durationMinutes: muteDuration ? parseInt(muteDuration) : undefined,
    });
    showResult(data);
    setMuteReason("");
    setMuteDuration("");
    setActionLoading(null);
  };

  const handleRawCommand = async () => {
    if (!rawCommand) return;
    setActionLoading("command");
    const data = await apiPost("/api/server/command", { command: rawCommand });
    showResult(data);
    setRawCommand("");
    setActionLoading(null);
  };

  // ===========================================
  // Player Actions
  // ===========================================
  const handleTeleport = async () => {
    if (!selectedPlayer) return;
    setActionLoading("teleport");
    const data = await apiPost(`/api/player/${selectedPlayer}/teleport`, {
      x: teleportX ? parseFloat(teleportX) : undefined,
      y: teleportY ? parseFloat(teleportY) : undefined,
      z: teleportZ ? parseFloat(teleportZ) : undefined,
      world: teleportWorld || undefined,
    });
    showResult(data);
    setActionLoading(null);
  };

  const handleSetGameMode = async () => {
    if (!selectedPlayer) return;
    setActionLoading("gamemode");
    const data = await apiPost(`/api/player/${selectedPlayer}/gamemode`, {
      gameMode,
    });
    showResult(data);
    setActionLoading(null);
  };

  const handleGiveItem = async () => {
    if (!selectedPlayer || !giveItemId) return;
    setActionLoading("give");
    const data = await apiPost(`/api/player/${selectedPlayer}/inventory/give`, {
      itemId: giveItemId,
      amount: parseInt(giveItemAmount) || 1,
    });
    showResult(data);
    setGiveItemId("");
    setGiveItemAmount("1");
    setActionLoading(null);
  };

  const handleClearInventory = async () => {
    if (!selectedPlayer) return;
    setActionLoading("clear");
    const data = await apiPost(
      `/api/player/${selectedPlayer}/inventory/clear`,
      {
        section: clearSection !== "all" ? clearSection : undefined,
      },
    );
    showResult(data);
    setActionLoading(null);
  };

  const handleSendMessage = async () => {
    if (!selectedPlayer || !privateMessage) return;
    setActionLoading("message");
    const data = await apiPost(`/api/player/${selectedPlayer}/message`, {
      message: privateMessage,
    });
    showResult(data);
    setPrivateMessage("");
    setActionLoading(null);
  };

  const handleGrantPermission = async () => {
    if (!selectedPlayer || !permission) return;
    setActionLoading("permission");
    const data = await apiPost(`/api/player/${selectedPlayer}/permissions`, {
      permission,
    });
    showResult(data);
    setPermission("");
    setActionLoading(null);
  };

  const handleAddToGroup = async () => {
    if (!selectedPlayer || !groupName) return;
    setActionLoading("group");
    const data = await apiPost(`/api/player/${selectedPlayer}/groups`, {
      group: groupName,
    });
    showResult(data);
    setGroupName("");
    setActionLoading(null);
  };

  // ===========================================
  // World Actions
  // ===========================================
  const handleSetTime = async () => {
    if (!selectedWorld || !worldTime) return;
    setActionLoading("time");
    const data = await apiPost(`/api/world/${selectedWorld}/time`, {
      time: parseInt(worldTime),
    });
    showResult(data);
    setActionLoading(null);
  };

  const handleSetWeather = async () => {
    if (!selectedWorld) return;
    setActionLoading("weather");
    const data = await apiPost(`/api/world/${selectedWorld}/weather`, {
      weather: worldWeather,
    });
    showResult(data);
    setActionLoading(null);
  };

  const handleSetBlock = async () => {
    if (!selectedWorld || !blockX || !blockY || !blockZ || !blockId) return;
    setActionLoading("block");
    const data = await apiPost(`/api/world/${selectedWorld}/blocks`, {
      x: parseInt(blockX),
      y: parseInt(blockY),
      z: parseInt(blockZ),
      blockId,
    });
    showResult(data);
    setActionLoading(null);
  };

  // ===========================================
  // Server Actions
  // ===========================================
  const handleSave = async () => {
    setActionLoading("save");
    const data = await apiPost("/api/world/save");
    showResult(data);
    setActionLoading(null);
  };

  const handleWhitelist = async () => {
    setActionLoading("whitelist");
    const players = whitelistPlayers
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    const data = await apiPost("/api/server/whitelist", {
      action: whitelistAction,
      players: players.length > 0 ? players : undefined,
    });
    showResult(data);
    setWhitelistPlayers("");
    fetchWhitelist();
    setActionLoading(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen text-white flex items-center justify-center">
        <div className="text-xl text-[#888888]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Server Commands</h1>
            <p className="text-[#666666] mt-1">
              Full control over your Hytale server
            </p>
          </div>
          <Link
            href="/"
            className="px-4 py-2 bg-[#1a1a1a] border border-[#333333] hover:bg-[#222222] rounded-lg text-sm font-medium transition flex items-center gap-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Dashboard
          </Link>
        </header>

        {/* Result Toast */}
        {result && (
          <div
            className={`fixed top-6 right-6 max-w-md p-4 rounded-lg shadow-lg z-50 ${
              result.success !== false && !result.error
                ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                : "bg-red-500/20 border border-red-500/40 text-red-300"
            }`}
          >
            <div className="font-medium">
              {result.success !== false && !result.error ? "Success" : "Error"}
            </div>
            <div className="text-sm mt-1 opacity-80">
              {result.message ||
                result.output ||
                result.error ||
                "Action completed"}
            </div>
          </div>
        )}

        {/* Player Selector */}
        <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Select Player</h2>
            <button
              onClick={fetchPlayers}
              className="text-[#666666] hover:text-white transition"
              title="Refresh players"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          {players.length === 0 ? (
            <p className="text-[#666666]">
              No players online. Some commands require a player to be selected.
            </p>
          ) : (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#555555]"
            >
              {players.map((p) => (
                <option key={p.uuid} value={p.uuid}>
                  {p.name} ({p.world})
                </option>
              ))}
            </select>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Admin Commands */}
          <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              Admin Commands
            </h2>

            {/* Raw Command */}
            <div className="mb-6 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Execute Raw Command
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={rawCommand}
                  onChange={(e) => setRawCommand(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleRawCommand()}
                  placeholder="e.g., help, list, time query daytime"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleRawCommand}
                  disabled={actionLoading === "command" || !rawCommand}
                  className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "command" ? "..." : "Run"}
                </button>
              </div>
            </div>

            {/* Kick */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Kick Player
              </label>
              <input
                type="text"
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
                placeholder="Reason (optional)"
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-[#555555]"
              />
              <button
                onClick={handleKick}
                disabled={actionLoading === "kick" || !selectedPlayer}
                className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "kick" ? "..." : "Kick Player"}
              </button>
            </div>

            {/* Ban */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Ban Player
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  placeholder="Duration (min)"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
              </div>
              <button
                onClick={handleBan}
                disabled={actionLoading === "ban" || !selectedPlayer}
                className="w-full px-4 py-2 bg-red-700 hover:bg-red-600 disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "ban" ? "..." : "Ban Player"}
              </button>
            </div>

            {/* Mute */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Mute Player
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input
                  type="text"
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  placeholder="Reason (optional)"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  placeholder="Duration (min)"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
              </div>
              <button
                onClick={handleMute}
                disabled={actionLoading === "mute" || !selectedPlayer}
                className="w-full px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "mute" ? "..." : "Mute Player"}
              </button>
            </div>

            {/* Broadcast */}
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Broadcast Message
              </label>
              <input
                type="text"
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Message to all players"
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-[#555555]"
              />
              <button
                onClick={handleBroadcast}
                disabled={actionLoading === "broadcast" || !broadcastMessage}
                className="w-full px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "broadcast" ? "..." : "Broadcast"}
              </button>
            </div>
          </section>

          {/* Player Commands */}
          <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#888888]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Player Commands
            </h2>

            {/* Teleport */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Teleport Player
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  value={teleportX}
                  onChange={(e) => setTeleportX(e.target.value)}
                  placeholder="X"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={teleportY}
                  onChange={(e) => setTeleportY(e.target.value)}
                  placeholder="Y"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={teleportZ}
                  onChange={(e) => setTeleportZ(e.target.value)}
                  placeholder="Z"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
              </div>
              <select
                value={teleportWorld}
                onChange={(e) => setTeleportWorld(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm mb-2 focus:outline-none focus:border-[#555555]"
              >
                <option key="same-world" value="">
                  Same world
                </option>
                {worlds.map((w) => (
                  <option key={`tp-${w.uuid}`} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleTeleport}
                disabled={actionLoading === "teleport" || !selectedPlayer}
                className="w-full px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "teleport" ? "..." : "Teleport"}
              </button>
            </div>

            {/* Game Mode */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Set Game Mode
              </label>
              <div className="flex gap-2">
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value)}
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                >
                  <option key="survival" value="survival">
                    Survival
                  </option>
                  <option key="creative" value="creative">
                    Creative
                  </option>
                  <option key="adventure" value="adventure">
                    Adventure
                  </option>
                  <option key="spectator" value="spectator">
                    Spectator
                  </option>
                </select>
                <button
                  onClick={handleSetGameMode}
                  disabled={actionLoading === "gamemode" || !selectedPlayer}
                  className="px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "gamemode" ? "..." : "Set"}
                </button>
              </div>
            </div>

            {/* Give Item */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Give Item
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="text"
                  value={giveItemId}
                  onChange={(e) => setGiveItemId(e.target.value)}
                  placeholder="Item ID"
                  className="col-span-2 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={giveItemAmount}
                  onChange={(e) => setGiveItemAmount(e.target.value)}
                  placeholder="Amount"
                  min="1"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
              </div>
              <button
                onClick={handleGiveItem}
                disabled={
                  actionLoading === "give" || !selectedPlayer || !giveItemId
                }
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "give" ? "..." : "Give Item"}
              </button>
            </div>

            {/* Clear Inventory */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Clear Inventory
              </label>
              <div className="flex gap-2">
                <select
                  value={clearSection}
                  onChange={(e) => setClearSection(e.target.value)}
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                >
                  <option key="all" value="all">
                    All
                  </option>
                  <option key="hotbar" value="hotbar">
                    Hotbar
                  </option>
                  <option key="armor" value="armor">
                    Armor
                  </option>
                  <option key="storage" value="storage">
                    Storage
                  </option>
                  <option key="utility" value="utility">
                    Utility
                  </option>
                  <option key="tools" value="tools">
                    Tools
                  </option>
                </select>
                <button
                  onClick={handleClearInventory}
                  disabled={actionLoading === "clear" || !selectedPlayer}
                  className="px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "clear" ? "..." : "Clear"}
                </button>
              </div>
            </div>

            {/* Send Message */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Send Private Message
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  placeholder="Message"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={
                    actionLoading === "message" ||
                    !selectedPlayer ||
                    !privateMessage
                  }
                  className="px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "message" ? "..." : "Send"}
                </button>
              </div>
            </div>

            {/* Permissions */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Grant Permission
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  placeholder="e.g., admin.teleport"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleGrantPermission}
                  disabled={
                    actionLoading === "permission" ||
                    !selectedPlayer ||
                    !permission
                  }
                  className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "permission" ? "..." : "Grant"}
                </button>
              </div>
            </div>

            {/* Groups */}
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Add to Group
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleAddToGroup}
                  disabled={
                    actionLoading === "group" || !selectedPlayer || !groupName
                  }
                  className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "group" ? "..." : "Add"}
                </button>
              </div>
            </div>
          </section>

          {/* World Commands */}
          <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064"
                />
              </svg>
              World Commands
            </h2>

            {/* World Selector */}
            <div className="mb-4">
              <label className="block text-[#888888] text-sm mb-2">
                Select World
              </label>
              <select
                value={selectedWorld}
                onChange={(e) => setSelectedWorld(e.target.value)}
                className="w-full bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
              >
                {worlds.length === 0 ? (
                  <option key="no-worlds" value="">
                    No worlds available
                  </option>
                ) : (
                  worlds.map((w) => (
                    <option key={w.uuid} value={w.uuid}>
                      {w.name} ({w.type})
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Set Time */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Set World Time
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="number"
                  value={worldTime}
                  onChange={(e) => setWorldTime(e.target.value)}
                  placeholder="Ticks (0-24000)"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleSetTime}
                  disabled={
                    actionLoading === "time" || !selectedWorld || !worldTime
                  }
                  className="px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "time" ? "..." : "Set"}
                </button>
              </div>
              <div className="flex gap-2">
                {[
                  { label: "Dawn", value: 0 },
                  { label: "Noon", value: 6000 },
                  { label: "Dusk", value: 12000 },
                  { label: "Midnight", value: 18000 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setWorldTime(preset.value.toString())}
                    className="flex-1 px-2 py-1 bg-[#222222] border border-[#333333] hover:bg-[#2a2a2a] rounded text-xs transition"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Set Weather */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Set Weather
              </label>
              <div className="flex gap-2">
                <select
                  value={worldWeather}
                  onChange={(e) => setWorldWeather(e.target.value)}
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                >
                  <option key="clear" value="clear">
                    Clear
                  </option>
                  <option key="rain" value="rain">
                    Rain
                  </option>
                  <option key="thunder" value="thunder">
                    Thunder
                  </option>
                </select>
                <button
                  onClick={handleSetWeather}
                  disabled={actionLoading === "weather" || !selectedWorld}
                  className="px-4 py-2 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "weather" ? "..." : "Set"}
                </button>
              </div>
            </div>

            {/* Set Block */}
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Set Block
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <input
                  type="number"
                  value={blockX}
                  onChange={(e) => setBlockX(e.target.value)}
                  placeholder="X"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={blockY}
                  onChange={(e) => setBlockY(e.target.value)}
                  placeholder="Y"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
                <input
                  type="number"
                  value={blockZ}
                  onChange={(e) => setBlockZ(e.target.value)}
                  placeholder="Z"
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                />
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="Block ID (e.g., stone, dirt)"
                  className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white font-mono text-sm focus:outline-none focus:border-[#555555]"
                />
                <button
                  onClick={handleSetBlock}
                  disabled={
                    actionLoading === "block" ||
                    !selectedWorld ||
                    !blockX ||
                    !blockY ||
                    !blockZ ||
                    !blockId
                  }
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-lg font-medium text-sm transition"
                >
                  {actionLoading === "block" ? "..." : "Set"}
                </button>
              </div>
            </div>
          </section>

          {/* Server Commands */}
          <section className="bg-[#151515] rounded-2xl p-6 border border-[#222222]">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg
                className="w-5 h-5 text-[#888888]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                />
              </svg>
              Server Commands
            </h2>

            {/* Save */}
            <div className="mb-4 p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Save Server
              </label>
              <button
                onClick={handleSave}
                disabled={actionLoading === "save"}
                className="w-full px-4 py-3 bg-[#333333] hover:bg-[#444444] disabled:opacity-50 rounded-lg font-medium transition flex items-center justify-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                {actionLoading === "save" ? "Saving..." : "Save World"}
              </button>
            </div>

            {/* Whitelist */}
            <div className="p-4 bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]">
              <label className="block text-[#888888] text-sm mb-2">
                Manage Whitelist
              </label>
              {whitelist && (
                <div className="mb-3 p-2 bg-[#0d0d0d] rounded text-sm border border-[#222222]">
                  <span
                    className={
                      whitelist.enabled ? "text-emerald-400" : "text-[#666666]"
                    }
                  >
                    {whitelist.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="text-[#666666] ml-2">
                    ({whitelist.playerCount} player
                    {whitelist.playerCount !== 1 ? "s" : ""})
                  </span>
                </div>
              )}
              <div className="flex gap-2 mb-2">
                <select
                  value={whitelistAction}
                  onChange={(e) => setWhitelistAction(e.target.value as any)}
                  className="bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                >
                  <option key="add" value="add">
                    Add Players
                  </option>
                  <option key="remove" value="remove">
                    Remove Players
                  </option>
                  <option key="enable" value="enable">
                    Enable
                  </option>
                  <option key="disable" value="disable">
                    Disable
                  </option>
                </select>
                {(whitelistAction === "add" ||
                  whitelistAction === "remove") && (
                  <input
                    type="text"
                    value={whitelistPlayers}
                    onChange={(e) => setWhitelistPlayers(e.target.value)}
                    placeholder="Player names (comma sep)"
                    className="flex-1 bg-[#0d0d0d] border border-[#333333] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#555555]"
                  />
                )}
              </div>
              <button
                onClick={handleWhitelist}
                disabled={
                  actionLoading === "whitelist" ||
                  ((whitelistAction === "add" ||
                    whitelistAction === "remove") &&
                    !whitelistPlayers)
                }
                className="w-full px-4 py-2 bg-white text-[#0d0d0d] hover:bg-[#e5e5e5] disabled:opacity-50 rounded-lg font-medium text-sm transition"
              >
                {actionLoading === "whitelist" ? "..." : "Update Whitelist"}
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <footer className="text-center text-[#555555] text-sm pt-4 border-t border-[#222222]">
          HyOS Server Manager • Commands Panel
        </footer>
      </div>
    </div>
  );
}
