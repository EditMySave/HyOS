"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { LEVEL_COLORS, LOG_LEVELS, useLogs } from "@/lib/services/logs";
import { cn } from "@/lib/utils";

export default function LogsPage() {
  const [logLimit, setLogLimit] = useState(2000);
  const { entries, source, error, isLoading, clear, resetAndReload } = useLogs({
    initialLimit: logLimit,
  });

  const [levelFilter, setLevelFilter] = useState("all");
  const [timeRange, setTimeRange] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isPaused, setIsPaused] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);

  const logContainerRef = useRef<HTMLDivElement>(null);
  const prevEntryCountRef = useRef<number>(0);

  // Filter logs based on level, time range, and search query
  const filteredEntries = useMemo(() => {
    const now = Date.now();

    return entries.filter((log) => {
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

      // Search filter - matches message, component, level, time, and date
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          log.message.toLowerCase().includes(query) ||
          log.component?.toLowerCase().includes(query) ||
          log.level.toLowerCase().includes(query) ||
          log.time.includes(query) ||
          log.date.includes(query)
        );
      }

      return true;
    });
  }, [entries, levelFilter, timeRange, searchQuery]);

  // Auto-scroll to bottom only when new entries are appended
  useEffect(() => {
    if (
      autoScroll &&
      logContainerRef.current &&
      entries.length > prevEntryCountRef.current
    ) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
    prevEntryCountRef.current = entries.length;
  }, [entries.length, autoScroll]);

  // Detect scroll position — disable auto-scroll when user scrolls up, re-enable at bottom
  useEffect(() => {
    const container = logContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(atBottom);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Handle clear button
  const handleClear = () => {
    clear();
    setAutoScroll(true);
  };

  // Handle reset and reload
  const handleResetAndReload = () => {
    resetAndReload();
    setAutoScroll(true);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              {LOG_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
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

          {/* Log Limit */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              LOG LIMIT
            </label>
            <input
              type="number"
              min="100"
              max="10000"
              step="100"
              value={logLimit}
              onChange={(e) =>
                setLogLimit(
                  Math.max(
                    100,
                    Math.min(10000, parseInt(e.target.value) || 2000),
                  ),
                )
              }
              className="w-full bg-input border border-border px-3 py-2 text-sm text-foreground"
            />
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
            {source !== "none" && (
              <span className="text-sm text-muted-foreground">
                Source: {source}
              </span>
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
            <button
              onClick={handleResetAndReload}
              className={cn(
                "px-4 py-2 text-sm font-medium border border-border",
                "bg-input hover:bg-accent text-foreground",
                "transition-colors",
              )}
            >
              Reload
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
            "font-mono text-xs overflow-auto h-[calc(100vh-320px)] min-h-[400px]",
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
          {!isLoading && !error && filteredEntries.length === 0 && (
            <div className="text-muted-foreground">
              {entries.length > 0
                ? "No logs match the current filters."
                : "No logs available. The container may not be running."}
            </div>
          )}
          {!isLoading && !error && filteredEntries.length > 0 && (
            <div className="space-y-0.5">
              {filteredEntries.map((log, index) => {
                const levelStyles = LEVEL_COLORS[log.level] || {
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
                    <div className="flex-1 min-w-0">
                      {/* Component name (if present) */}
                      {log.component && (
                        <span className="text-foreground-secondary/60 text-[10px] font-mono block mb-0.5">
                          [{log.component}]
                        </span>
                      )}
                      {/* Main message */}
                      <span className="text-foreground break-words">
                        {log.message}
                      </span>
                    </div>
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
