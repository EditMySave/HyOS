"use client";

import { useServerStatus } from "@/lib/services/server/server.hooks";
import { cn } from "@/lib/utils";

export function SubNav() {
  const { data: status } = useServerStatus();
  const isOnline = status?.online ?? false;

  return (
    <div className="h-8 border-b border-border bg-background/50 px-6">
      <div className="mx-auto max-w-7xl flex items-center h-full gap-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "size-2 rounded-none",
            isOnline ? "bg-status-online" : "bg-status-offline"
          )}
        />
        <span>{isOnline ? "Server Online" : "Server Offline"}</span>
      </div>
    </div>
  );
}
