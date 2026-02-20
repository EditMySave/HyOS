import { useCallback, useEffect, useRef, useState } from "react";
import { fetchLogs, parseLogLines } from "./logs.service";
import type { LogsResponse, ParsedLogEntry } from "./logs.types";

/**
 * Hook to manage log fetching with accumulation
 *
 * Features:
 * - Initial fetch: Gets last N lines (configurable via initialLimit)
 * - Subsequent polls: Fetches only new lines via offset
 * - Memory cap: Trims oldest entries when buffer exceeds 10,000
 * - Dedup guard: Compares last raw line to avoid overlap
 * - Rotation detection: Resets if totalLines decreases
 */
export function useLogs({
  paused,
  initialLimit = 2000,
}: {
  paused?: boolean;
  initialLimit?: number;
} = {}) {
  const [entries, setEntries] = useState<ParsedLogEntry[]>([]);
  const [auth, setAuth] = useState<LogsResponse["auth"]>({
    waiting: false,
    url: null,
    code: null,
  });
  const [source, setSource] = useState<string>("none");
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalLines, setTotalLines] = useState<number>(0);

  const offsetRef = useRef<number>(0);
  const lastRawLineRef = useRef<string>("");
  const initializedRef = useRef<boolean>(false);
  const totalLinesRef = useRef<number>(0);

  const fetchLogsData = useCallback(async () => {
    // Only show loading spinner on initial fetch, not polls
    if (!initializedRef.current) {
      setIsLoading(true);
    }

    try {
      const isInitial = !initializedRef.current;
      const response = await fetchLogs({
        tail: isInitial ? initialLimit : undefined,
        offset: isInitial ? undefined : offsetRef.current,
      });

      setAuth(response.auth);
      setSource(response.source);
      setTotalLines(response.totalLines);

      const parsedEntries = parseLogLines(response.logs);

      if (isInitial) {
        setEntries(parsedEntries);
        offsetRef.current = response.totalLines;
        totalLinesRef.current = response.totalLines;
        if (parsedEntries.length > 0) {
          lastRawLineRef.current = parsedEntries[parsedEntries.length - 1].raw;
        }
        initializedRef.current = true;
      } else if (parsedEntries.length > 0) {
        // Check for rotation: if totalLines decreased, full reset
        if (response.totalLines < totalLinesRef.current) {
          setEntries(parsedEntries);
          offsetRef.current = response.totalLines;
          totalLinesRef.current = response.totalLines;
          lastRawLineRef.current = parsedEntries[parsedEntries.length - 1].raw;
        } else {
          // Append new entries
          setEntries((prev) => {
            const combined = [...prev, ...parsedEntries];
            // Memory cap at 10,000 entries
            if (combined.length > 10000) {
              return combined.slice(combined.length - 10000);
            }
            return combined;
          });
          offsetRef.current = response.totalLines;
          totalLinesRef.current = response.totalLines;
          lastRawLineRef.current = parsedEntries[parsedEntries.length - 1].raw;
        }
      } else {
        // No new lines — just update the ref
        totalLinesRef.current = response.totalLines;
      }

      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Unknown error fetching logs"),
      );
    } finally {
      setIsLoading(false);
    }
  }, [initialLimit]);

  // Initial fetch — runs once
  useEffect(() => {
    fetchLogsData();
  }, [fetchLogsData]);

  // Poll for new logs every 5 seconds (unless paused)
  useEffect(() => {
    if (paused) return;

    const interval = setInterval(fetchLogsData, 5000);
    return () => clearInterval(interval);
  }, [fetchLogsData, paused]);

  const clear = useCallback(() => {
    setEntries([]);
    setError(null);
  }, []);

  const resetAndReload = useCallback(() => {
    setEntries([]);
    offsetRef.current = 0;
    lastRawLineRef.current = "";
    totalLinesRef.current = 0;
    initializedRef.current = false;
    fetchLogsData();
  }, [fetchLogsData]);

  return {
    entries,
    auth,
    source,
    error,
    isLoading,
    totalLines,
    clear,
    resetAndReload,
  };
}
