"use client";

import {
  AlertCircle,
  ArrowDownToLine,
  Loader2,
  MessageSquare,
  Play,
  RefreshCw,
  RotateCw,
  Save,
  Square,
} from "lucide-react";
import { useState } from "react";
import { mutate } from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  useRestartServer,
  useServerStatus,
  useStartServer,
  useStopServer,
  useUpdateStatus,
  useCheckForUpdates,
} from "@/lib/services/server";
import { useBroadcast, useSave } from "@/lib/services/world";

export function QuickActions() {
  const {
    data: status,
    error: statusError,
    mutate: mutateStatus,
  } = useServerStatus();
  const { trigger: startServer, isMutating: isStarting } = useStartServer();
  const { trigger: stopServer, isMutating: isStopping } = useStopServer();
  const { trigger: restartServer, isMutating: isRestarting } =
    useRestartServer();
  const { trigger: save, isMutating: isSaving } = useSave();
  const { trigger: broadcast, isMutating: isBroadcasting } = useBroadcast();
  const {
    data: updateStatus,
    mutate: mutateUpdateStatus,
  } = useUpdateStatus();
  const { trigger: checkForUpdates, isMutating: isCheckingUpdates } =
    useCheckForUpdates();

  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastMessage, setBroadcastMessage] = useState("");

  const isRunning = status?.state === "running";
  const isStopped = status?.state === "stopped";
  const isStartingUp = status?.state === "starting";
  const isLoading = isStarting || isStopping || isRestarting || isStartingUp;
  const hasError = !!statusError;
  // Don't disable start when stopped, only when there's an error or currently loading
  const disableStart = hasError || isLoading || isRunning;
  const disableStop = hasError || isLoading || isStopped;

  const handleStart = async () => {
    try {
      await startServer();
      void mutateStatus();
    } catch (error) {
      console.error("Failed to start server:", error);
    }
  };

  const handleStop = async () => {
    try {
      await stopServer();
      void mutateStatus();
    } catch (error) {
      console.error("Failed to stop server:", error);
    }
  };

  const handleRestart = async () => {
    try {
      await restartServer();
      void mutateStatus();
    } catch (error) {
      console.error("Failed to restart server:", error);
    }
  };

  const handleBackup = async () => {
    try {
      await save();
      void mutateStatus();
    } catch (error) {
      console.error("Failed to backup:", error);
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMessage.trim()) return;
    try {
      await broadcast({ message: broadcastMessage });
      setBroadcastMessage("");
      setBroadcastOpen(false);
      void mutateStatus();
      mutate("players");
    } catch (error) {
      console.error("Failed to broadcast:", error);
    }
  };

  const handleCheckForUpdates = async () => {
    try {
      await checkForUpdates();
      void mutateUpdateStatus();
    } catch (error) {
      console.error("Failed to check for updates:", error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {hasError && (
          <div className="flex items-center gap-2 rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span>Failed to load server status</span>
            <Button
              variant="outline"
              size="sm"
              className="ml-auto shrink-0"
              onClick={() => void mutateStatus()}
            >
              Retry
            </Button>
          </div>
        )}
        <Button
          onClick={handleStart}
          disabled={disableStart}
          className="w-full justify-start"
          variant="outline"
        >
          {isStarting || isStartingUp ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Play className="mr-2 size-4" />
          )}
          {isStartingUp ? "Starting..." : "Start Server"}
        </Button>

        <Button
          onClick={handleStop}
          disabled={disableStop}
          className="w-full justify-start"
          variant="outline"
        >
          {isStopping ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Square className="mr-2 size-4" />
          )}
          Stop Server
        </Button>

        <Button
          onClick={handleRestart}
          disabled={disableStop}
          className="w-full justify-start"
          variant="outline"
        >
          {isRestarting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RotateCw className="mr-2 size-4" />
          )}
          Restart Server
        </Button>

        <Button
          onClick={handleBackup}
          disabled={!isRunning || isSaving || hasError}
          className="w-full justify-start"
          variant="outline"
        >
          {isSaving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Backup
        </Button>

        <Dialog open={broadcastOpen} onOpenChange={setBroadcastOpen}>
          <DialogTrigger asChild>
            <Button
              disabled={!isRunning || isBroadcasting || hasError}
              className="w-full justify-start"
              variant="outline"
            >
              <MessageSquare className="mr-2 size-4" />
              Broadcast Message
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Broadcast Message</DialogTitle>
              <DialogDescription>
                Send a message to all players on the server.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Enter message..."
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleBroadcast();
                  }
                }}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBroadcastOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleBroadcast}
                disabled={!broadcastMessage.trim() || isBroadcasting}
              >
                {isBroadcasting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update Check Section */}
        <div className="pt-2 border-t border-border space-y-2">
          <Button
            onClick={handleCheckForUpdates}
            disabled={isCheckingUpdates || hasError}
            className="w-full justify-start"
            variant="outline"
          >
            {isCheckingUpdates ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 size-4" />
            )}
            Check for Updates
          </Button>

          {updateStatus && (
            <div
              className={`flex items-center gap-2 rounded border px-3 py-2 text-sm ${
                updateStatus.needsUpdate
                  ? "border-warning/50 bg-warning/10 text-warning"
                  : "border-success/50 bg-success/10 text-success"
              }`}
            >
              <ArrowDownToLine className="size-4 shrink-0" />
              <div className="flex-1">
                <div className="font-medium">
                  {updateStatus.needsUpdate ? "Update Available" : "Up to Date"}
                </div>
                <div className="text-xs opacity-80">
                  v{updateStatus.currentVersion}
                  {updateStatus.needsUpdate && ` → v${updateStatus.latestVersion}`}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
