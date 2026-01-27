"use client";

import { AlertCircle, Ban, Loader2, UserMinus } from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useBanPlayer, useKickPlayer, usePlayers } from "@/lib/services/player";

function formatConnectedTime(connectedAt: number): string {
  const now = Date.now();
  const diff = now - connectedAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export function PlayersTable() {
  const {
    data: players,
    error,
    isLoading,
    mutate: mutatePlayers,
  } = usePlayers();
  const { trigger: kickPlayer, isMutating: isKicking } = useKickPlayer();
  const { trigger: banPlayer, isMutating: isBanning } = useBanPlayer();

  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: "kick" | "ban" | null;
    player: { uuid: string; name: string } | null;
  }>({
    open: false,
    type: null,
    player: null,
  });
  const [reason, setReason] = useState("");

  const handleActionClick = (
    type: "kick" | "ban",
    player: { uuid: string; name: string },
  ) => {
    setActionDialog({ open: true, type, player });
    setReason("");
  };

  const handleConfirmAction = async () => {
    if (!actionDialog.player || !actionDialog.type) return;

    try {
      if (actionDialog.type === "kick") {
        await kickPlayer({
          uuid: actionDialog.player.uuid,
          reason: reason || "Kicked by admin",
        });
      } else {
        await banPlayer({
          uuid: actionDialog.player.uuid,
          reason: reason || "Banned by admin",
        });
      }
      // Refresh players list
      mutate("players");
      setActionDialog({ open: false, type: null, player: null });
      setReason("");
    } catch (error) {
      console.error(`Failed to ${actionDialog.type} player:`, error);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Online Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Online Players</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">Failed to load</span>
          </div>
          <p className="text-xs text-foreground-muted">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void mutatePlayers()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!players || players.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Online Players</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-foreground-secondary">
            No players online
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Online Players ({players.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>World</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Connected Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((player) => (
                <TableRow key={player.uuid}>
                  <TableCell className="font-medium">{player.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{player.world}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {player.position.x.toFixed(0)},{" "}
                    {player.position.y.toFixed(0)},{" "}
                    {player.position.z.toFixed(0)}
                  </TableCell>
                  <TableCell>
                    {formatConnectedTime(player.connectedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleActionClick("kick", {
                                  uuid: player.uuid,
                                  name: player.name,
                                })
                              }
                              disabled={isKicking || isBanning}
                            >
                              <UserMinus className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Kick Player</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() =>
                                handleActionClick("ban", {
                                  uuid: player.uuid,
                                  name: player.name,
                                })
                              }
                              disabled={isKicking || isBanning}
                            >
                              <Ban className="size-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Ban Player</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog({ open, type: null, player: null })
        }
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionDialog.type === "kick" ? "Kick" : "Ban"} Player
            </DialogTitle>
            <DialogDescription>
              {actionDialog.type === "kick"
                ? `Are you sure you want to kick ${actionDialog.player?.name}?`
                : `Are you sure you want to ban ${actionDialog.player?.name}?`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleConfirmAction();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, type: null, player: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAction}
              disabled={isKicking || isBanning}
              variant={actionDialog.type === "ban" ? "destructive" : "default"}
            >
              {(isKicking || isBanning) && (
                <Loader2 className="mr-2 size-4 animate-spin" />
              )}
              Confirm {actionDialog.type === "kick" ? "Kick" : "Ban"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
