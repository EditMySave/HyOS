"use client";

import { Activity, MemoryStick } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerStatus } from "@/lib/services/server";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / k ** i).toFixed(1)} ${sizes[i]}`;
}

export function ServerStats() {
  const { data: status } = useServerStatus();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    const measureLatency = async () => {
      const start = performance.now();
      try {
        const response = await fetch("/api/server/status");
        await response.json();
        const end = performance.now();
        setLatency(Math.round(end - start));
      } catch {
        setLatency(null);
      }
    };

    measureLatency();
    const interval = setInterval(measureLatency, 5000);
    return () => clearInterval(interval);
  }, []);

  const hasMemory = status?.memory != null;
  const memoryUsed = status?.memory?.used ?? 0;
  const memoryMax = status?.memory?.max ?? 1;
  const memoryPercent = hasMemory ? (memoryUsed / memoryMax) * 100 : 0;
  const memoryFree = status?.memory?.free ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Server Stats</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MemoryStick className="size-4 text-foreground-secondary" />
              <span className="text-sm text-foreground-secondary">
                Memory Usage
              </span>
            </div>
            {hasMemory ? (
              <span className="text-sm font-medium">
                {formatBytes(memoryUsed)} / {formatBytes(memoryMax)}
              </span>
            ) : (
              <span className="text-sm text-foreground-muted">N/A</span>
            )}
          </div>
          {hasMemory ? (
            <>
              <div className="w-full bg-muted h-2">
                <div
                  className="bg-primary h-2 transition-all"
                  style={{ width: `${Math.min(memoryPercent, 100)}%` }}
                />
              </div>
              <div className="text-xs text-foreground-muted">
                {memoryPercent.toFixed(1)}% used · {formatBytes(memoryFree)}{" "}
                free
              </div>
            </>
          ) : (
            <div className="text-xs text-foreground-muted">
              Server stopped or no memory data
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Activity className="size-4 text-foreground-secondary" />
            <span className="text-sm text-foreground-secondary">Latency</span>
          </div>
          <div className="text-right">
            <div className="text-2xl font-semibold">
              {latency !== null ? `${latency}ms` : "N/A"}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
