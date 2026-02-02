"use client";

import {
  Globe,
  History,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
  Terminal,
  Trash2,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  getActiveParam,
  HYTALE_COMMANDS,
  loadRecentCommands,
  saveRecentCommands,
} from "@/lib/data/hytale-commands";
import type { HytaleCommand } from "@/lib/data/hytale-commands";
import { cn } from "@/lib/utils";
import {
  useAddToGroup,
  useBanPlayer,
  useBroadcast,
  useClearInventory,
  useExecuteCommand,
  useGiveItem,
  useGrantPermission,
  useKickPlayer,
  useManageWhitelist,
  useMutePlayer,
  usePlayers,
  useSave,
  useSendMessage,
  useSetBlock,
  useSetGameMode,
  useSetWorldTime,
  useSetWorldWeather,
  useTeleportPlayerFull,
  useWhitelist,
  useWorlds,
} from "@/lib/services";
import type { InventorySection } from "@/lib/services/player";
import type { Weather } from "@/lib/services/world";
import { worldId } from "@/lib/services/world/world.types";

interface ResultToast {
  success: boolean;
  message: string;
}

export default function CommandsPage() {
  const [result, setResult] = useState<ResultToast | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<string>("");
  const [selectedWorldId, setSelectedWorldId] = useState<string>("");

  const [rawCommand, setRawCommand] = useState("");
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(0);
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
  const [clearSection, setClearSection] = useState<InventorySection>("all");
  const [privateMessage, setPrivateMessage] = useState("");
  const [permission, setPermission] = useState("");
  const [groupName, setGroupName] = useState("");
  const [worldTime, setWorldTime] = useState("");
  const [worldWeather, setWorldWeather] = useState<Weather>("clear");
  const [blockX, setBlockX] = useState("");
  const [blockY, setBlockY] = useState("");
  const [blockZ, setBlockZ] = useState("");
  const [blockId, setBlockId] = useState("");
  const [whitelistAction, setWhitelistAction] = useState<
    "add" | "remove" | "enable" | "disable"
  >("add");
  const [whitelistPlayers, setWhitelistPlayers] = useState("");

  const {
    data: players,
    isLoading: playersLoading,
    mutate: mutatePlayers,
  } = usePlayers(10000);
  const { data: worlds, isLoading: worldsLoading } = useWorlds();
  const { data: whitelist, mutate: mutateWhitelist } = useWhitelist();

  const { trigger: execCommand, isMutating: isExecCommand } =
    useExecuteCommand();
  const { trigger: kickPlayer, isMutating: isKicking } = useKickPlayer();
  const { trigger: banPlayer, isMutating: isBanning } = useBanPlayer();
  const { trigger: mutePlayer, isMutating: isMuting } = useMutePlayer();
  const { trigger: broadcast, isMutating: isBroadcasting } = useBroadcast();
  const { trigger: teleport, isMutating: isTeleporting } =
    useTeleportPlayerFull();
  const { trigger: setGameModeMutate, isMutating: isSettingGameMode } =
    useSetGameMode();
  const { trigger: giveItem, isMutating: isGivingItem } = useGiveItem();
  const { trigger: clearInv, isMutating: isClearingInv } = useClearInventory();
  const { trigger: sendMsg, isMutating: isSendingMsg } = useSendMessage();
  const { trigger: grantPerm, isMutating: isGrantingPerm } =
    useGrantPermission();
  const { trigger: addToGroupMutate, isMutating: isAddingToGroup } =
    useAddToGroup();
  const { trigger: setTime, isMutating: isSettingTime } = useSetWorldTime();
  const { trigger: setWeather, isMutating: isSettingWeather } =
    useSetWorldWeather();
  const { trigger: setBlockMutate, isMutating: isSettingBlock } =
    useSetBlock();
  const { trigger: save, isMutating: isSaving } = useSave();
  const { trigger: manageWhitelistMutate, isMutating: isManagingWhitelist } =
    useManageWhitelist();

  const showResult = useCallback((success: boolean, message: string) => {
    setResult({ success, message });
    setTimeout(() => setResult(null), 5000);
  }, []);

  useEffect(() => {
    if (players && players.length > 0 && !selectedPlayer) {
      setSelectedPlayer(players[0].uuid);
    }
  }, [players, selectedPlayer]);

  useEffect(() => {
    if (worlds && worlds.length > 0 && !selectedWorldId) {
      setSelectedWorldId(worldId(worlds[0]));
    }
  }, [worlds, selectedWorldId]);

  useEffect(() => {
    setRecentCommands(loadRecentCommands());
  }, []);

  const normalizedInput = rawCommand.replace(/^\//, "").trim().toLowerCase();
  const filteredCommands = useMemo(
    () =>
      HYTALE_COMMANDS.filter((cmd) =>
        cmd.name.toLowerCase().startsWith(normalizedInput)
      ).slice(0, 12),
    [normalizedInput]
  );
  const matchedCommand: HytaleCommand | undefined =
    filteredCommands[0] ?? undefined;

  const commandForHelp = useMemo(() => {
    const n = rawCommand.replace(/^\//, "").trim();
    if (!n) return undefined;
    const matched = HYTALE_COMMANDS.filter(
      (cmd) => n === cmd.name || n.startsWith(`${cmd.name} `)
    ).sort((a, b) => b.name.length - a.name.length)[0];
    return matched ?? undefined;
  }, [rawCommand]);

  const activeParam =
    commandForHelp ? getActiveParam(commandForHelp, rawCommand) : null;

  const selectSuggestion = useCallback((cmd: HytaleCommand) => {
    setRawCommand(cmd.syntax.split(" ")[0] ?? cmd.syntax);
    setShowSuggestions(false);
    setSelectedSuggestion(0);
  }, []);

  const handleRawCommand = useCallback(async () => {
    if (!rawCommand.trim()) return;
    const trimmed = rawCommand.trim();
    try {
      const res = await execCommand(trimmed);
      showResult(
        res.success,
        res.output || res.error || "Command executed"
      );
      setRecentCommands((prev) => {
        const next = [trimmed, ...prev.filter((c) => c !== trimmed)].slice(
          0,
          10
        );
        saveRecentCommands(next);
        return next;
      });
      setRawCommand("");
      setShowSuggestions(false);
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to execute command"
      );
    }
  }, [rawCommand, execCommand, showResult]);

  const handleTypeaheadKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (showSuggestions && filteredCommands.length > 0) {
          const idx = selectedSuggestion % filteredCommands.length;
          selectSuggestion(filteredCommands[idx]);
          e.preventDefault();
          return;
        }
        e.preventDefault();
        void handleRawCommand();
        return;
      }
      if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedSuggestion(0);
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestion((i) =>
          filteredCommands.length ? (i + 1) % filteredCommands.length : 0
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestion((i) =>
          filteredCommands.length
            ? (i - 1 + filteredCommands.length) % filteredCommands.length
            : 0
        );
        return;
      }
    },
    [
      showSuggestions,
      filteredCommands,
      selectedSuggestion,
      selectSuggestion,
      handleRawCommand,
    ]
  );

  const clearHistory = useCallback(() => {
    setRecentCommands([]);
    saveRecentCommands([]);
  }, []);

  const handleKick = async () => {
    if (!selectedPlayer) return;
    try {
      await kickPlayer({ uuid: selectedPlayer, reason: kickReason || undefined });
      showResult(true, "Player kicked");
      setKickReason("");
      void mutatePlayers();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to kick player"
      );
    }
  };

  const handleBan = async () => {
    if (!selectedPlayer) return;
    try {
      await banPlayer({
        uuid: selectedPlayer,
        reason: banReason || undefined,
        duration: banDuration ? Number.parseInt(banDuration, 10) : undefined,
      });
      showResult(true, "Player banned");
      setBanReason("");
      setBanDuration("");
      void mutatePlayers();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to ban player"
      );
    }
  };

  const handleMute = async () => {
    if (!selectedPlayer) return;
    try {
      await mutePlayer({
        uuid: selectedPlayer,
        reason: muteReason || undefined,
        durationMinutes: muteDuration
          ? Number.parseInt(muteDuration, 10)
          : undefined,
      });
      showResult(true, "Player muted");
      setMuteReason("");
      setMuteDuration("");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to mute player"
      );
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await broadcast({ message: broadcastMessage.trim() });
      showResult(true, "Message broadcast");
      setBroadcastMessage("");
      void mutatePlayers();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to broadcast"
      );
    }
  };

  const handleTeleport = async () => {
    if (!selectedPlayer) return;
    try {
      await teleport({
        uuid: selectedPlayer,
        x: teleportX ? Number.parseFloat(teleportX) : undefined,
        y: teleportY ? Number.parseFloat(teleportY) : undefined,
        z: teleportZ ? Number.parseFloat(teleportZ) : undefined,
        world: teleportWorld || undefined,
      });
      showResult(true, "Player teleported");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to teleport"
      );
    }
  };

  const handleSetGameMode = async () => {
    if (!selectedPlayer) return;
    try {
      await setGameModeMutate({ uuid: selectedPlayer, gameMode });
      showResult(true, "Game mode updated");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to set game mode"
      );
    }
  };

  const handleGiveItem = async () => {
    if (!selectedPlayer || !giveItemId.trim()) return;
    try {
      await giveItem({
        uuid: selectedPlayer,
        itemId: giveItemId.trim(),
        amount: Number.parseInt(giveItemAmount, 10) || 1,
      });
      showResult(true, "Item given");
      setGiveItemId("");
      setGiveItemAmount("1");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to give item"
      );
    }
  };

  const handleClearInventory = async () => {
    if (!selectedPlayer) return;
    try {
      await clearInv({
        uuid: selectedPlayer,
        section: clearSection === "all" ? undefined : clearSection,
      });
      showResult(true, "Inventory cleared");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to clear inventory"
      );
    }
  };

  const handleSendMessage = async () => {
    if (!selectedPlayer || !privateMessage.trim()) return;
    try {
      await sendMsg({ uuid: selectedPlayer, message: privateMessage.trim() });
      showResult(true, "Message sent");
      setPrivateMessage("");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to send message"
      );
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedPlayer || !permission.trim()) return;
    try {
      await grantPerm({ uuid: selectedPlayer, permission: permission.trim() });
      showResult(true, "Permission granted");
      setPermission("");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to grant permission"
      );
    }
  };

  const handleAddToGroup = async () => {
    if (!selectedPlayer || !groupName.trim()) return;
    try {
      await addToGroupMutate({
        uuid: selectedPlayer,
        group: groupName.trim(),
      });
      showResult(true, "Added to group");
      setGroupName("");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to add to group"
      );
    }
  };

  const handleSetTime = async () => {
    if (!selectedWorldId || !worldTime) return;
    try {
      await setTime({
        worldId: selectedWorldId,
        time: Number.parseInt(worldTime, 10),
      });
      showResult(true, "World time set");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to set time"
      );
    }
  };

  const handleSetWeather = async () => {
    if (!selectedWorldId) return;
    try {
      await setWeather({
        worldId: selectedWorldId,
        weather: worldWeather,
      });
      showResult(true, "Weather set");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to set weather"
      );
    }
  };

  const handleSetBlock = async () => {
    if (
      !selectedWorldId ||
      !blockX ||
      !blockY ||
      !blockZ ||
      !blockId.trim()
    )
      return;
    try {
      await setBlockMutate({
        worldId: selectedWorldId,
        x: Number.parseInt(blockX, 10),
        y: Number.parseInt(blockY, 10),
        z: Number.parseInt(blockZ, 10),
        blockId: blockId.trim(),
      });
      showResult(true, "Block set");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to set block"
      );
    }
  };

  const handleSave = async () => {
    try {
      await save();
      showResult(true, "World saved");
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to save"
      );
    }
  };

  const handleWhitelist = async () => {
    const playersList = whitelistPlayers
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if ((whitelistAction === "add" || whitelistAction === "remove") && !playersList.length)
      return;
    try {
      await manageWhitelistMutate({
        action: whitelistAction,
        players: playersList.length > 0 ? playersList : undefined,
      });
      showResult(true, "Whitelist updated");
      setWhitelistPlayers("");
      void mutateWhitelist();
    } catch (e) {
      showResult(
        false,
        e instanceof Error ? e.message : "Failed to update whitelist"
      );
    }
  };

  const timePresets = [
    { label: "Dawn", value: 0 },
    { label: "Noon", value: 6000 },
    { label: "Dusk", value: 12000 },
    { label: "Midnight", value: 18000 },
  ];

  const loading = playersLoading || worldsLoading;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="font-cablefied text-4xl font-bold text-foreground mb-2">
          Server Commands
        </h1>
        <p className="text-muted-foreground">
          Full control over your Hytale server
        </p>
      </div>

      {result ? (
        <div
          className={cn(
            "fixed top-6 right-6 z-50 max-w-md border p-4 shadow-lg",
            result.success
              ? "border-status-online/40 bg-status-online/10 text-status-online"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          )}
        >
          <div className="font-medium">
            {result.success ? "Success" : "Error"}
          </div>
          <div className="mt-1 text-sm opacity-90">{result.message}</div>
        </div>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Select Player
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void mutatePlayers()}
            title="Refresh players"
          >
            <RefreshCw className="size-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {!players || players.length === 0 ? (
            <p className="text-muted-foreground">
              No players online. Some commands require a player to be selected.
            </p>
          ) : (
            <select
              value={selectedPlayer}
              onChange={(e) => setSelectedPlayer(e.target.value)}
              className="w-full border border-border bg-input px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {players.map((p) => (
                <option key={p.uuid} value={p.uuid}>
                  {p.name} ({p.world})
                </option>
              ))}
            </select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Terminal className="size-5" />
            Execute Raw Command
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {(commandForHelp ?? matchedCommand) &&
              normalizedInput.length > 0 && (
                <div className="text-muted-foreground mb-1 text-sm">
                  <span className="font-mono">
                    {(commandForHelp ?? matchedCommand).syntax}
                  </span>{" "}
                  — {(commandForHelp ?? matchedCommand).description}
                  {activeParam && (
                    <div className="border-accent mt-1 border-l-2 pl-2">
                      <span className="text-foreground font-medium">
                        {activeParam.param.name}
                      </span>
                      <span className="text-muted-foreground">
                        {" "}
                        ({activeParam.param.type}
                        {activeParam.param.required ? ", required" : ""})
                      </span>
                      <div>{activeParam.param.description}</div>
                      {activeParam.param.examples?.length ? (
                        <div className="mt-0.5">
                          Examples:{" "}
                          <span className="font-mono">
                            {activeParam.param.examples.join(", ")}
                          </span>
                        </div>
                      ) : null}
                      {activeParam.param.enumValues?.length ? (
                        <div className="mt-0.5">
                          Values:{" "}
                          <span className="font-mono">
                            {activeParam.param.enumValues.join(", ")}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              )}
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Input
                  value={rawCommand}
                  onChange={(e) => {
                    setRawCommand(e.target.value);
                    setShowSuggestions(true);
                    setSelectedSuggestion(0);
                  }}
                  onKeyDown={handleTypeaheadKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() =>
                    setTimeout(() => setShowSuggestions(false), 150)
                  }
                  placeholder="e.g., /help, /time set 12, /give stone 64"
                  className="font-mono w-full"
                />
                {showSuggestions && filteredCommands.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto border border-border bg-card">
                    {filteredCommands.map((cmd, i) => (
                      <button
                        key={cmd.name}
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left",
                          i === selectedSuggestion && "bg-accent"
                        )}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectSuggestion(cmd);
                        }}
                      >
                        <div className="font-mono text-sm">{cmd.syntax}</div>
                        <div className="text-xs text-muted-foreground">
                          {cmd.description}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button
                onClick={() => void handleRawCommand()}
                disabled={isExecCommand || !rawCommand.trim()}
              >
                {isExecCommand ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Run"
                )}
              </Button>
            </div>
          </div>

          <div className="border-border border-t pt-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-2 text-sm">
                <History className="size-4" />
                Recent Commands
              </span>
              {recentCommands.length > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearHistory}
                  title="Clear history"
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            {recentCommands.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No recent commands
              </p>
            ) : (
              <div className="space-y-1">
                {recentCommands.map((cmd, i) => (
                  <button
                    key={`${i}-${cmd}`}
                    type="button"
                    onClick={() => setRawCommand(cmd)}
                    className="hover:bg-accent w-full px-2 py-1 text-left font-mono text-sm"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="size-5" />
              Admin Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Kick Player
              </label>
              <Input
                value={kickReason}
                onChange={(e) => setKickReason(e.target.value)}
                placeholder="Reason (optional)"
                className="mb-2"
              />
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleKick}
                disabled={isKicking || !selectedPlayer}
              >
                {isKicking ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Kick Player"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Ban Player
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Reason (optional)"
                />
                <Input
                  type="number"
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  placeholder="Duration (min)"
                />
              </div>
              <Button
                variant="destructive"
                className="w-full"
                onClick={handleBan}
                disabled={isBanning || !selectedPlayer}
              >
                {isBanning ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Ban Player"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Mute Player
              </label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={muteReason}
                  onChange={(e) => setMuteReason(e.target.value)}
                  placeholder="Reason (optional)"
                />
                <Input
                  type="number"
                  value={muteDuration}
                  onChange={(e) => setMuteDuration(e.target.value)}
                  placeholder="Duration (min)"
                />
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleMute}
                disabled={isMuting || !selectedPlayer}
              >
                {isMuting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Mute Player"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Broadcast Message
              </label>
              <Input
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                placeholder="Message to all players"
                className="mb-2"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={handleBroadcast}
                disabled={isBroadcasting || !broadcastMessage.trim()}
              >
                {isBroadcasting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Broadcast"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-5" />
              Player Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Teleport Player
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  value={teleportX}
                  onChange={(e) => setTeleportX(e.target.value)}
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={teleportY}
                  onChange={(e) => setTeleportY(e.target.value)}
                  placeholder="Y"
                />
                <Input
                  type="number"
                  value={teleportZ}
                  onChange={(e) => setTeleportZ(e.target.value)}
                  placeholder="Z"
                />
              </div>
              <select
                value={teleportWorld}
                onChange={(e) => setTeleportWorld(e.target.value)}
                className="mb-2 w-full border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Same world</option>
                {worlds?.map((w) => (
                  <option key={worldId(w)} value={w.name}>
                    {w.name}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleTeleport}
                disabled={isTeleporting || !selectedPlayer}
              >
                {isTeleporting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Teleport"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Set Game Mode
              </label>
              <div className="flex gap-2">
                <select
                  value={gameMode}
                  onChange={(e) => setGameMode(e.target.value)}
                  className="flex-1 border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="survival">Survival</option>
                  <option value="creative">Creative</option>
                  <option value="adventure">Adventure</option>
                  <option value="spectator">Spectator</option>
                </select>
                <Button
                  variant="outline"
                  onClick={handleSetGameMode}
                  disabled={isSettingGameMode || !selectedPlayer}
                >
                  {isSettingGameMode ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Set"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Give Item
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  value={giveItemId}
                  onChange={(e) => setGiveItemId(e.target.value)}
                  placeholder="Item ID"
                  className="col-span-2"
                />
                <Input
                  type="number"
                  min={1}
                  value={giveItemAmount}
                  onChange={(e) => setGiveItemAmount(e.target.value)}
                  placeholder="Amount"
                />
              </div>
              <Button
                className="w-full bg-status-online text-primary-foreground hover:bg-status-online/90"
                onClick={handleGiveItem}
                disabled={
                  isGivingItem || !selectedPlayer || !giveItemId.trim()
                }
              >
                {isGivingItem ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Give Item"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Clear Inventory
              </label>
              <div className="flex gap-2">
                <select
                  value={clearSection}
                  onChange={(e) =>
                    setClearSection(e.target.value as InventorySection)
                  }
                  className="flex-1 border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="all">All</option>
                  <option value="hotbar">Hotbar</option>
                  <option value="armor">Armor</option>
                  <option value="storage">Storage</option>
                  <option value="utility">Utility</option>
                  <option value="tools">Tools</option>
                </select>
                <Button
                  variant="destructive"
                  onClick={handleClearInventory}
                  disabled={isClearingInv || !selectedPlayer}
                >
                  {isClearingInv ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Clear"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Send Private Message
              </label>
              <div className="flex gap-2">
                <Input
                  value={privateMessage}
                  onChange={(e) => setPrivateMessage(e.target.value)}
                  placeholder="Message"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSendMessage}
                  disabled={
                    isSendingMsg || !selectedPlayer || !privateMessage.trim()
                  }
                >
                  {isSendingMsg ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Grant Permission
              </label>
              <div className="flex gap-2">
                <Input
                  value={permission}
                  onChange={(e) => setPermission(e.target.value)}
                  placeholder="e.g., admin.teleport"
                  className="font-mono flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleGrantPermission}
                  disabled={
                    isGrantingPerm || !selectedPlayer || !permission.trim()
                  }
                >
                  {isGrantingPerm ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Grant"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Add to Group
              </label>
              <div className="flex gap-2">
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Group name"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleAddToGroup}
                  disabled={
                    isAddingToGroup || !selectedPlayer || !groupName.trim()
                  }
                >
                  {isAddingToGroup ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-status-online">
              <Globe className="size-5" />
              World Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Select World
              </label>
              <select
                value={selectedWorldId}
                onChange={(e) => setSelectedWorldId(e.target.value)}
                className="w-full border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {!worlds || worlds.length === 0 ? (
                  <option value="">No worlds available</option>
                ) : (
                  worlds.map((w) => (
                    <option key={worldId(w)} value={worldId(w)}>
                      {w.name} ({w.type})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Set World Time
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={worldTime}
                  onChange={(e) => setWorldTime(e.target.value)}
                  placeholder="Ticks (0-24000)"
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  onClick={handleSetTime}
                  disabled={
                    isSettingTime || !selectedWorldId || !worldTime
                  }
                >
                  {isSettingTime ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Set"
                  )}
                </Button>
              </div>
              <div className="flex gap-2">
                {timePresets.map((preset) => (
                  <Button
                    key={preset.label}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setWorldTime(String(preset.value))}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Set Weather
              </label>
              <div className="flex gap-2">
                <select
                  value={worldWeather}
                  onChange={(e) =>
                    setWorldWeather(e.target.value as Weather)
                  }
                  className="flex-1 border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="clear">Clear</option>
                  <option value="rain">Rain</option>
                  <option value="thunder">Thunder</option>
                </select>
                <Button
                  variant="outline"
                  onClick={handleSetWeather}
                  disabled={isSettingWeather || !selectedWorldId}
                >
                  {isSettingWeather ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Set"
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Set Block
              </label>
              <div className="grid grid-cols-3 gap-2">
                <Input
                  type="number"
                  value={blockX}
                  onChange={(e) => setBlockX(e.target.value)}
                  placeholder="X"
                />
                <Input
                  type="number"
                  value={blockY}
                  onChange={(e) => setBlockY(e.target.value)}
                  placeholder="Y"
                />
                <Input
                  type="number"
                  value={blockZ}
                  onChange={(e) => setBlockZ(e.target.value)}
                  placeholder="Z"
                />
              </div>
              <div className="flex gap-2">
                <Input
                  value={blockId}
                  onChange={(e) => setBlockId(e.target.value)}
                  placeholder="Block ID (e.g., stone, dirt)"
                  className="font-mono flex-1"
                />
                <Button
                  className="bg-status-online text-primary-foreground hover:bg-status-online/90"
                  onClick={handleSetBlock}
                  disabled={
                    isSettingBlock ||
                    !selectedWorldId ||
                    !blockX ||
                    !blockY ||
                    !blockZ ||
                    !blockId.trim()
                  }
                >
                  {isSettingBlock ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "Set"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-muted-foreground">
              <Server className="size-5" />
              Server Commands
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Save Server
              </label>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Save World"
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-muted-foreground text-sm">
                Manage Whitelist
              </label>
              {whitelist ? (
                <div className="mb-3 border border-border bg-background-secondary px-2 py-2 text-sm">
                  <span
                    className={
                      whitelist.enabled
                        ? "text-status-online"
                        : "text-muted-foreground"
                    }
                  >
                    {whitelist.enabled ? "Enabled" : "Disabled"}
                  </span>
                  <span className="ml-2 text-muted-foreground">
                    ({whitelist.playerCount} player
                    {whitelist.playerCount !== 1 ? "s" : ""})
                  </span>
                </div>
              ) : null}
              <div className="flex gap-2">
                <select
                  value={whitelistAction}
                  onChange={(e) =>
                    setWhitelistAction(
                      e.target.value as "add" | "remove" | "enable" | "disable"
                    )
                  }
                  className="border border-border bg-input px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="add">Add Players</option>
                  <option value="remove">Remove Players</option>
                  <option value="enable">Enable</option>
                  <option value="disable">Disable</option>
                </select>
                {(whitelistAction === "add" ||
                  whitelistAction === "remove") ? (
                  <Input
                    value={whitelistPlayers}
                    onChange={(e) => setWhitelistPlayers(e.target.value)}
                    placeholder="Player names (comma sep)"
                    className="flex-1"
                  />
                ) : null}
              </div>
              <Button
                className="w-full"
                onClick={handleWhitelist}
                disabled={
                  isManagingWhitelist ||
                  ((whitelistAction === "add" ||
                    whitelistAction === "remove") &&
                    !whitelistPlayers.trim())
                }
              >
                {isManagingWhitelist ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Update Whitelist"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
