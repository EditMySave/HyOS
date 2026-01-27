import { z } from "zod";

// ============================================================================
// World Types
// ============================================================================

export const weatherSchema = z.enum(["clear", "rain", "thunder"]);

export const worldInfoSchema = z.object({
  uuid: z.string().nullable(),
  name: z.string(),
  playerCount: z.number(),
  type: z.string(),
});

/** World ID for API calls: use uuid when present, otherwise name (plugin may return null uuid). */
export function worldId(w: { uuid: string | null; name: string }): string {
  return w.uuid ?? w.name;
}

export const worldTimeInfoSchema = z.object({
  world: z.string(),
  time: z.number(),
  dayTime: z.number(),
  phase: z.string(),
});

export const worldWeatherInfoSchema = z.object({
  world: z.string(),
  weather: z.string(),
  remainingTicks: z.number(),
  isThundering: z.boolean(),
});

export const blockInfoSchema = z.object({
  world: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  blockId: z.string(),
  properties: z.record(z.string(), z.string()),
});

export type Weather = z.infer<typeof weatherSchema>;
export type WorldInfo = z.infer<typeof worldInfoSchema>;
export type WorldTimeInfo = z.infer<typeof worldTimeInfoSchema>;
export type WorldWeatherInfo = z.infer<typeof worldWeatherInfoSchema>;
export type BlockInfo = z.infer<typeof blockInfoSchema>;
