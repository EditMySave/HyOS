import type { ModProvider } from "../types";
import { CurseForgeProvider } from "./curseforge.provider";
import { ModtaleProvider } from "./modtale.provider";
import { NexusModsProvider } from "./nexusmods.provider";
import type { ModProviderAdapter } from "./provider.interface";

const curseforgeProvider = new CurseForgeProvider();
const modtaleProvider = new ModtaleProvider();
const nexusmodsProvider = new NexusModsProvider();

export function getProviders(): Record<ModProvider, ModProviderAdapter> {
  return {
    curseforge: curseforgeProvider,
    modtale: modtaleProvider,
    nexusmods: nexusmodsProvider,
  };
}

export function getProvider(id: ModProvider): ModProviderAdapter {
  const providers = getProviders();
  const p = providers[id];
  if (!p) throw new Error(`Unknown provider: ${id}`);
  return p;
}

export { CurseForgeProvider } from "./curseforge.provider";
export { ModtaleProvider } from "./modtale.provider";
export { NexusModsProvider } from "./nexusmods.provider";
export type { ModProviderAdapter } from "./provider.interface";
