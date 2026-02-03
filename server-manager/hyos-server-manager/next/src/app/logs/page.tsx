"use client";

import useSWR from "swr";
import { useEffect, useRef, useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface LogsResponse {
  logs: string;
  auth: {
    waiting: boolean;
    url: string | null;
    code: string | null;
  };
  source: string;
  timestamp: number;
}

interface ParsedLogLine {
  date: string;
  time: string;
  level: string;
  message: string;
  raw: string;
  timestamp: number;
}

const fetcher = async (url: string): Promise<LogsResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  return response.json();
};

const LEVEL_COLORS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  INFO: {
    text: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-l-chart-1",
  },
  PLAYER: {
    text: "text-chart-4",
    bg: "bg-chart-4/10",
    border: "border-l-chart-4",
  },
  WARNING: {
    text: "text-status-warning",
    bg: "bg-status-warning/10",
    border: "border-l-status-warning",
  },
  ERROR: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-l-destructive",
  },
  SYSTEM: {
    text: "text-status-online",
    bg: "bg-status-online/10",
    border: "border-l-status-online",
  },
  WARN: {
    text: "text-status-warning",
    bg: "bg-status-warning/10",
    border: "border-l-status-warning",
  },
  DEBUG: {
    text: "text-chart-2",
    bg: "bg-chart-2/10",
    border: "border-l-chart-2",
  },
};

function parseLogLine(line: string): ParsedLogLine {
  // Match: [YYYY/MM/DD HH:MM:SS   LEVEL] message
  const match = line.match(
    /^\[(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(\w+)\]\s+(.*)$/,
  );
  if (match) {
    const dateStr = match[1]; // YYYY/MM/DD
    const timeStr = match[2]; // HH:MM:SS
    const level = match[3]; // INFO, WARN, ERROR, etc.
    const message = match[4];

    // Parse timestamp for time filtering
    let timestamp = 0;
    try {
      // Convert YYYY/MM/DD HH:MM:SS to Date
      timestamp = new Date(
        `${dateStr.replace(/\//g, "-")} ${timeStr}`,
      ).getTime();
    } catch {
      // If parsing fails, timestamp remains 0
    }

    return {
      date: dateStr,
      time: timeStr,
      level,
      message,
      raw: line,
      timestamp,
    };
  }
  // If no match, return as raw line
  return {
    date: "",
    time: "",
    level: "",
    message: line,
    raw: line,
    timestamp: 0,
  };
}

export default function LogsPage() {
  const [autoScroll, setAutoScroll] = useState(true);
  const [logsTail, setLogsTail] = useState(200);
  const [levelFilter, setLevelFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [displayedLogs, setDisplayedLogs] = useState<string>("");
  const logContainerRef = useRef<HTMLDivElement>(null);

  const { data, error, isLoading } = useSWR<LogsResponse>(
    `/api/server/logs?tail=${logsTail}`,
    fetcher,
    {
      refreshInterval: isPaused ? 0 : 5000,
      revalidateOnFocus: !isPaused,
    },
  );

  // Update displayed logs when new data arrives
  useEffect(() => {
    if (data?.logs) {
      setDisplayedLogs(data.logs);
    }
  }, [data?.logs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current && displayedLogs) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [displayedLogs, autoScroll]);

  // Parse and filter logs
  const filteredLogs = useMemo(() => {
    if (!displayedLogs) return [];

    const lines = displayedLogs.split("\n").filter((line) => line.trim());
    const parsed = lines.map(parseLogLine);

    const now = Date.now();

    return parsed.filter((log) => {
      // Level filter
      if (levelFilter !== "all" && log.level !== levelFilter) {
        return false;
      }

      // Time range filter
      if (timeRange !== "all" && log.timestamp > 0) {
        const diff = now - log.timestamp;
        switch (timeRange) {
          case "hour":
            if (diff > 3600000) return false; // 1 hour
            break;
          case "day":
            if (diff > 86400000) return false; // 24 hours
            break;
          case "week":
            if (diff > 604800000) return false; // 7 days
            break;
          default:
            break;
        }
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.level.toLowerCase().includes(query) ||
          log.time.includes(query) ||
          log.date.includes(query)
        );
      }

      return true;
    });
  }, [displayedLogs, levelFilter, timeRange, searchQuery]);

  const handleClear = () => {
    setDisplayedLogs("");
  };

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2 font-cablefied">
          Log Viewer
        </h1>
        <p className="text-muted-foreground">
          View real-time server logs and events
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-card border border-border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              LEVEL
            </label>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
              <option value="PLAYER">PLAYER</option>
              <option value="SYSTEM">SYSTEM</option>
            </select>
          </div>

          {/* Time Range */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              TIME RANGE
            </label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground"
            >
              <option value="all">All Time</option>
              <option value="hour">Last Hour</option>
              <option value="day">Last 24 Hours</option>
              <option value="week">Last 7 Days</option>
            </select>
          </div>

          {/* Search */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              SEARCH
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search logs..."
                className="w-full bg-input border border-border px-3 py-2 pl-10 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stream Controls */}
      <div className="bg-card border border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">
              LIVE LOG STREAM
            </h2>
            {!isPaused && (
              <div className="flex items-center gap-2">
                <span className="size-2 bg-status-online" />
                <span className="text-sm text-muted-foreground">Live</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className={cn(
                "px-4 py-2 text-sm font-medium border border-border",
                "bg-input hover:bg-accent text-foreground",
                "transition-colors",
              )}
            >
              {isPaused ? "Resume" : "Pause"}
            </button>
            <button
              onClick={handleClear}
              className={cn(
                "px-4 py-2 text-sm font-medium border border-border",
                "bg-input hover:bg-accent text-foreground",
                "transition-colors",
              )}
            >
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Log Display */}
      <div className="bg-card border border-border p-6">
        <div
          ref={logContainerRef}
          className={cn(
            "bg-background-secondary border border-border p-4",
            "font-mono text-xs overflow-auto h-[600px]",
          )}
        >
          {isLoading && (
            <div className="text-muted-foreground">Loading logs...</div>
          )}
          {error && (
            <div className="text-destructive">
              Error loading logs: {error.message}
            </div>
          )}
          {!isLoading && !error && filteredLogs.length === 0 && (
            <div className="text-muted-foreground">
              {displayedLogs
                ? "No logs match the current filters."
                : "No logs available. The container may not be running."}
            </div>
          )}
          {!isLoading && !error && filteredLogs.length > 0 && (
            <div className="space-y-0.5">
              {filteredLogs.map((log, index) => {
                const levelStyles = log.level
                  ? LEVEL_COLORS[log.level] || {
                      text: "text-foreground-secondary",
                      bg: "bg-background-secondary",
                      border: "border-l-border",
                    }
                  : {
                      text: "text-foreground-secondary",
                      bg: "bg-background-secondary",
                      border: "border-l-border",
                    };

                // Create unique key using timestamp, index, and first chars of message
                const uniqueKey = `${log.timestamp}-${index}-${log.raw.slice(0, 30).replace(/\s/g, "")}`;

                return (
                  <div
                    key={uniqueKey}
                    className={cn(
                      "flex gap-3 px-3 py-2 border-l-4",
                      levelStyles.bg,
                      levelStyles.border,
                      "border-b border-border/50",
                    )}
                  >
                    {log.time && (
                      <span className="text-foreground-secondary flex-shrink-0 font-mono text-xs">
                        {log.time}
                      </span>
                    )}
                    {log.level && (
                      <span
                        className={cn(
                          "flex-shrink-0 px-2 py-0.5 font-semibold text-xs uppercase",
                          levelStyles.text,
                          "bg-background/50",
                        )}
                      >
                        {log.level}
                      </span>
                    )}
                    <span className="text-foreground-secondary break-words flex-1">
                      {log.message}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
