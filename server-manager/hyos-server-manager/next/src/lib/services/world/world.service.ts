import { z } from "zod";
import {
  type BlockInfo,
  blockInfoSchema,
  type Weather,
  type WorldInfo,
  type WorldTimeInfo,
  type WorldWeatherInfo,
  worldId,
  worldInfoSchema,
  worldTimeInfoSchema,
  worldWeatherInfoSchema,
} from "./world.types";

/**
 * Get list of worlds
 */
export async function getWorlds(): Promise<WorldInfo[]> {
  const response = await fetch("/api/world");
  if (!response.ok) {
    throw new Error(`Failed to fetch worlds: ${response.statusText}`);
  }
  const data = await response.json();
  const worldsSchema = z.object({
    count: z.number(),
    worlds: z.array(worldInfoSchema),
  });
  const parsed = worldsSchema.parse(data);
  return parsed.worlds;
}

/**
 * Broadcast a message to all players
 */
export async function broadcast(message: string): Promise<void> {
  const response = await fetch("/api/world/broadcast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!response.ok) {
    throw new Error(`Failed to broadcast: ${response.statusText}`);
  }
}

/**
 * Set world time (uses first world if multiple exist)
 */
export async function setTime(time: number): Promise<void> {
  const worlds = await getWorlds();
  if (worlds.length > 0) {
    await setWorldTime(worldId(worlds[0]), time);
  } else {
    throw new Error("No worlds available");
  }
}

/**
 * Set weather (uses first world if multiple exist)
 */
export async function setWeather(weather: Weather): Promise<void> {
  const worlds = await getWorlds();
  if (worlds.length > 0) {
    await setWorldWeather(worldId(worlds[0]), weather);
  } else {
    throw new Error("No worlds available");
  }
}

/**
 * Get world time
 */
export async function getWorldTime(worldId: string): Promise<WorldTimeInfo> {
  const response = await fetch(`/api/world/${worldId}/time`);
  if (!response.ok) {
    throw new Error(`Failed to get world time: ${response.statusText}`);
  }
  const data = await response.json();
  return worldTimeInfoSchema.parse(data);
}

/**
 * Set world time
 */
export async function setWorldTime(
  worldId: string,
  time: number,
  relative?: boolean,
): Promise<WorldTimeInfo> {
  const response = await fetch(`/api/world/${worldId}/time`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ time, relative: relative || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set world time: ${response.statusText}`);
  }
  const data = await response.json();
  return worldTimeInfoSchema.parse(data);
}

/**
 * Get world weather
 */
export async function getWorldWeather(
  worldId: string,
): Promise<WorldWeatherInfo> {
  const response = await fetch(`/api/world/${worldId}/weather`);
  if (!response.ok) {
    throw new Error(`Failed to get world weather: ${response.statusText}`);
  }
  const data = await response.json();
  return worldWeatherInfoSchema.parse(data);
}

/**
 * Set world weather
 */
export async function setWorldWeather(
  worldId: string,
  weather: Weather,
  duration?: number,
): Promise<WorldWeatherInfo> {
  const response = await fetch(`/api/world/${worldId}/weather`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ weather, duration: duration || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set world weather: ${response.statusText}`);
  }
  const data = await response.json();
  return worldWeatherInfoSchema.parse(data);
}

/**
 * Get block at coordinates
 */
export async function getBlock(
  worldId: string,
  x: number,
  y: number,
  z: number,
): Promise<BlockInfo> {
  const response = await fetch(
    `/api/world/${worldId}/blocks?x=${x}&y=${y}&z=${z}`,
  );
  if (!response.ok) {
    throw new Error(`Failed to get block: ${response.statusText}`);
  }
  const data = await response.json();
  return blockInfoSchema.parse(data);
}

/**
 * Set block at coordinates
 */
export async function setBlock(
  worldId: string,
  x: number,
  y: number,
  z: number,
  blockId: string,
  nbt?: string,
): Promise<BlockInfo> {
  const response = await fetch(`/api/world/${worldId}/blocks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x, y, z, blockId, nbt: nbt || null }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set block: ${response.statusText}`);
  }
  const data = await response.json();
  return blockInfoSchema.parse(data);
}

/**
 * Force save all worlds
 */
export async function save(): Promise<void> {
  const response = await fetch("/api/world/save", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error(`Failed to save: ${response.statusText}`);
  }
}
