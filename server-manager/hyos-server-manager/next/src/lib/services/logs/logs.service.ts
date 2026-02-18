import {
  type LogLevel,
  type LogsResponse,
  logsResponseSchema,
  type ParsedLogEntry,
} from "./logs.types";

/**
 * Fetch logs from the API
 * @param tail - Number of lines to fetch from the end of the log
 * @param offset - Starting position for incremental fetching (line number)
 */
export async function fetchLogs({
  tail,
  offset,
}: {
  tail?: number;
  offset?: number;
} = {}): Promise<LogsResponse> {
  const params = new URLSearchParams();
  if (tail !== undefined) params.set("tail", tail.toString());
  if (offset !== undefined) params.set("offset", offset.toString());

  const url = `/api/server/logs${params.size > 0 ? `?${params.toString()}` : ""}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }
  const data = await response.json();
  return logsResponseSchema.parse(data);
}

/**
 * Parse raw log lines into structured entries
 * Handles multi-line entries (stack traces) by folding continuation lines
 * into the preceding entry's message.
 */
export function parseLogLines(raw: string): ParsedLogEntry[] {
  const lines = raw.split("\n");
  const entries: ParsedLogEntry[] = [];

  // Regex to match log lines: [YYYY/MM/DD HH:MM:SS LEVEL] [Component] message
  const logLineRegex =
    /^\[(\d{4}\/\d{2}\/\d{2})\s+(\d{2}:\d{2}:\d{2})\s+(\w+)\]\s+(?:\[([^\]]+)\]\s*)?(.*)$/;

  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines

    const match = line.match(logLineRegex);

    if (match) {
      // This is a new log entry (starts with timestamp)
      const dateStr = match[1]; // YYYY/MM/DD
      const timeStr = match[2]; // HH:MM:SS
      const level = match[3] as LogLevel; // INFO, WARN, ERROR
      const component = match[4] || null; // [ComponentName] or null
      const message = match[5];

      // Parse timestamp for time filtering
      let timestamp = 0;
      try {
        timestamp = new Date(
          `${dateStr.replace(/\//g, "-")} ${timeStr}`,
        ).getTime();
      } catch {
        // If parsing fails, timestamp remains 0
      }

      entries.push({
        date: dateStr,
        time: timeStr,
        level,
        component,
        message,
        raw: line,
        timestamp,
        isMultiLine: false,
      });
    } else {
      // This is a continuation line (stack trace or multi-line message)
      // Fold it into the previous entry
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1];
        lastEntry.raw += `\n${line}`;
        lastEntry.message += `\n${line}`;
        lastEntry.isMultiLine = true;
      }
    }
  }

  return entries;
}
