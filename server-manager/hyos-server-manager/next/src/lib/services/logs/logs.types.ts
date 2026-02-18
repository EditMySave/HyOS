import { z } from "zod";

// ============================================================================
// Log Level Types
// ============================================================================

export const LOG_LEVELS = ["INFO", "WARN", "ERROR"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

// ============================================================================
// Parsed Log Entry Types
// ============================================================================

export interface ParsedLogEntry {
  date: string;
  time: string;
  level: LogLevel;
  message: string;
  component: string | null;
  raw: string;
  timestamp: number;
  isMultiLine: boolean;
}

// ============================================================================
// API Response Types
// ============================================================================

export const logsResponseSchema = z.object({
  logs: z.string(),
  auth: z.object({
    waiting: z.boolean(),
    url: z.string().nullable(),
    code: z.string().nullable(),
  }),
  source: z.string(),
  timestamp: z.number(),
  totalLines: z.number(),
});

export type LogsResponse = z.infer<typeof logsResponseSchema>;

// ============================================================================
// Level Colors
// ============================================================================

export const LEVEL_COLORS: Record<
  string,
  { text: string; bg: string; border: string }
> = {
  INFO: {
    text: "text-chart-1",
    bg: "bg-chart-1/10",
    border: "border-l-chart-1",
  },
  WARN: {
    text: "text-status-warning",
    bg: "bg-status-warning/10",
    border: "border-l-status-warning",
  },
  ERROR: {
    text: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-l-destructive",
  },
};
