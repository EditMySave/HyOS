import { promises as fs } from "node:fs";
import path from "node:path";

export interface ModRegistryEntry {
  provider: "curseforge" | "modtale" | "nexusmods";
  providerModId: string;
  fileId: string;
  installedVersion: string;
  authors: string[];
  summary: string;
  iconUrl: string | null;
  websiteUrl: string;
  installedAt: string;
}

export interface ModRegistry {
  [fileName: string]: ModRegistryEntry;
}

const REGISTRY_FILE = ".mod-registry.json";

export async function loadRegistry(modsPath: string): Promise<ModRegistry> {
  try {
    const filePath = path.join(modsPath, REGISTRY_FILE);
    const content = await fs.readFile(filePath, "utf8");
    return JSON.parse(content) as ModRegistry;
  } catch {
    return {};
  }
}

export async function saveRegistry(
  modsPath: string,
  registry: ModRegistry,
): Promise<void> {
  const filePath = path.join(modsPath, REGISTRY_FILE);
  const tempPath = `${filePath}.tmp`;
  await fs.mkdir(modsPath, { recursive: true });
  await fs.writeFile(tempPath, JSON.stringify(registry, null, 2));
  await fs.rename(tempPath, filePath);
}

export async function registerMod(
  modsPath: string,
  fileName: string,
  entry: ModRegistryEntry,
): Promise<void> {
  const registry = await loadRegistry(modsPath);
  registry[fileName] = entry;
  await saveRegistry(modsPath, registry);
}

export async function unregisterMod(
  modsPath: string,
  fileName: string,
): Promise<void> {
  const registry = await loadRegistry(modsPath);
  delete registry[fileName];
  await saveRegistry(modsPath, registry);
}
