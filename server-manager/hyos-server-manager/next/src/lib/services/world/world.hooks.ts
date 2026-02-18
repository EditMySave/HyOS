import useSWR from "swr";
import useSWRMutation from "swr/mutation";
import {
  broadcast,
  getBlock,
  getWorlds,
  getWorldTime,
  getWorldWeather,
  save,
  setBlock,
  setTime,
  setWeather,
  setWorldTime,
  setWorldWeather,
} from "./world.service";
import type {
  BlockInfo,
  Weather,
  WorldInfo,
  WorldTimeInfo,
  WorldWeatherInfo,
} from "./world.types";

/**
 * Hook to get list of worlds
 */
export function useWorlds() {
  return useSWR<WorldInfo[]>("worlds", getWorlds);
}

/**
 * Hook to get world time
 * Refresh every 30 seconds to avoid rate limiting
 */
export function useWorldTime(worldId: string | null) {
  return useSWR<WorldTimeInfo>(
    worldId ? `world-time-${worldId}` : null,
    worldId ? () => getWorldTime(worldId) : null,
    { refreshInterval: 30000, dedupingInterval: 10000 },
  );
}

/**
 * Hook to set world time
 */
export function useSetWorldTime() {
  return useSWRMutation<
    WorldTimeInfo,
    Error,
    string,
    { worldId: string; time: number; relative?: boolean }
  >("set-world-time", async (_, { arg }) =>
    setWorldTime(arg.worldId, arg.time, arg.relative),
  );
}

/**
 * Hook to get world weather
 */
export function useWorldWeather(worldId: string | null) {
  return useSWR<WorldWeatherInfo>(
    worldId ? `world-weather-${worldId}` : null,
    worldId ? () => getWorldWeather(worldId) : null,
  );
}

/**
 * Hook to set world weather
 */
export function useSetWorldWeather() {
  return useSWRMutation<
    WorldWeatherInfo,
    Error,
    string,
    { worldId: string; weather: Weather; duration?: number }
  >("set-world-weather", async (_, { arg }) =>
    setWorldWeather(arg.worldId, arg.weather, arg.duration),
  );
}

/**
 * Hook to get block at coordinates
 */
export function useBlock(
  worldId: string | null,
  x: number | null,
  y: number | null,
  z: number | null,
) {
  const key =
    worldId && x !== null && y !== null && z !== null
      ? `block-${worldId}-${x}-${y}-${z}`
      : null;
  return useSWR<BlockInfo>(
    key,
    key ? () => getBlock(worldId!, x!, y!, z!) : null,
  );
}

/**
 * Hook to set block at coordinates
 */
export function useSetBlock() {
  return useSWRMutation<
    BlockInfo,
    Error,
    string,
    {
      worldId: string;
      x: number;
      y: number;
      z: number;
      blockId: string;
      nbt?: string;
    }
  >("set-block", async (_, { arg }) =>
    setBlock(arg.worldId, arg.x, arg.y, arg.z, arg.blockId, arg.nbt),
  );
}

/**
 * Hook to broadcast a message
 */
export function useBroadcast() {
  return useSWRMutation<void, Error, string, { message: string }>(
    "broadcast",
    async (_, { arg }) => broadcast(arg.message),
  );
}

/**
 * Hook to set time (uses first world)
 */
export function useSetTime() {
  return useSWRMutation<void, Error, string, { time: number }>(
    "set-time",
    async (_, { arg }) => setTime(arg.time),
  );
}

/**
 * Hook to set weather (uses first world)
 */
export function useSetWeather() {
  return useSWRMutation<void, Error, string, { weather: Weather }>(
    "set-weather",
    async (_, { arg }) => setWeather(arg.weather),
  );
}

/**
 * Hook to save worlds
 */
export function useSave() {
  return useSWRMutation<void, Error, string>("save", async () => save());
}
