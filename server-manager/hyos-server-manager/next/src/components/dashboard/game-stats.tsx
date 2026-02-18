"use client";

import {
  AlertCircle,
  Check,
  Clock,
  Copy,
  Globe,
  Package,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useConfig } from "@/lib/services/config";
import { useServerStatus, useServerVersion } from "@/lib/services/server";

function formatUptime(seconds: number | null): string {
  if (seconds === null) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStateColor(state: string): string {
  switch (state) {
    case "running":
      return "bg-status-online";
    case "stopped":
      return "bg-status-offline";
    case "starting":
    case "stopping":
      return "bg-status-warning";
    default:
      return "bg-muted";
  }
}

export function GameStats() {
  const { data: config } = useConfig();
  const {
    data: status,
    error: statusError,
    isLoading: statusLoading,
    mutate: mutateStatus,
  } = useServerStatus();
  const {
    data: version,
    error: versionError,
    isLoading: versionLoading,
    mutate: mutateVersion,
  } = useServerVersion();

  const [copied, setCopied] = useState(false);

  const handleCopyAddress = () => {
    const address = getAddress();
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getAddress = (): string => {
    const host = window.location.hostname;
    const port = config?.gamePort;
    return `${host}:${port}`;
  };

  const error = statusError ?? versionError;
  const retry = () => {
    void mutateStatus();
    void mutateVersion();
  };

  if (statusLoading || versionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Game Stats</CardTitle>
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
          <CardTitle>Game Stats</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            <span className="text-sm">Failed to load</span>
          </div>
          <p className="text-xs text-foreground-muted">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button variant="outline" size="sm" onClick={retry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Game Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-foreground-secondary" />
            <span className="text-sm text-foreground-secondary">Players</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {status?.playerCount ?? 0} / {status?.maxPlayers ?? 0}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-foreground-secondary" />
            <span className="text-sm text-foreground-secondary">Uptime</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {formatUptime(status?.uptime ?? null)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="size-4 text-foreground-secondary" />
            <span className="text-sm text-foreground-secondary">Version</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {version?.gameVersion ?? "Unknown"}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-foreground-secondary" />
            <span className="text-sm text-foreground-secondary">
              Server Address
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-right">
              <div className="text-xl font-semibold">{getAddress()}</div>
            </div>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={handleCopyAddress}
              title="Copy to clipboard"
            >
              {copied ? (
                <Check className="size-4" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-foreground-secondary">Status</span>
          <Badge
            className={`${getStateColor(status?.state ?? "unknown")} text-white`}
          >
            {status?.state ?? "unknown"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
