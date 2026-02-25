import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { getConfigPath } from "@/lib/services/config/config.loader";
import type { ModProvider } from "./browser/types";
import type { ProviderSettingsResponse } from "./providers.types";

const MOD_PROVIDERS_FILE = "mod-providers.json";

const providerEntrySchema = z.object({
  enabled: z.boolean(),
  apiKey: z.string().nullable(),
});

const modProvidersFileSchema = z.object({
  curseforge: providerEntrySchema,
  modtale: providerEntrySchema,
  nexusmods: providerEntrySchema,
});

type ModProvidersFile = z.infer<typeof modProvidersFileSchema>;

function defaultState(): ModProvidersFile {
  return {
    curseforge: { enabled: false, apiKey: null },
    modtale: { enabled: false, apiKey: null },
    nexusmods: { enabled: false, apiKey: null },
  };
}

export function getModProvidersPath(): string {
  return path.join(path.dirname(getConfigPath()), MOD_PROVIDERS_FILE);
}

async function readFile(): Promise<ModProvidersFile | null> {
  try {
    const filePath = getModProvidersPath();
    const content = await fs.readFile(filePath, "utf8");
    const raw = JSON.parse(content) as Record<string, unknown>;
    return modProvidersFileSchema.parse(raw);
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    if (err instanceof z.ZodError) return null;
    console.error("Failed to read mod providers config:", err);
    return null;
  }
}

/**
 * Load provider settings for server use (includes API keys). Only use server-side.
 */
export async function loadProviderConfig(): Promise<ModProvidersFile> {
  const file = await readFile();
  return { ...defaultState(), ...file };
}

/**
 * Load provider settings for API response (never includes API key values).
 */
export async function loadProviderSettings(): Promise<ProviderSettingsResponse> {
  const config = await loadProviderConfig();
  const providers: ProviderSettingsResponse["providers"] = (
    ["curseforge", "modtale", "nexusmods"] as const
  ).map((id) => ({
    id,
    enabled: config[id].enabled,
    hasApiKey: config[id].apiKey != null && config[id].apiKey.length > 0,
  }));
  return { providers };
}

/**
 * Save settings for one provider (merge over existing). Atomic write.
 */
export async function saveProviderSettings(
  provider: ModProvider,
  update: { enabled?: boolean; apiKey?: string | null },
): Promise<ModProvidersFile> {
  const existing = await loadProviderConfig();
  const next: ModProvidersFile = {
    ...existing,
    [provider]: {
      ...existing[provider],
      ...(typeof update.enabled === "boolean" && { enabled: update.enabled }),
      ...(update.apiKey !== undefined && { apiKey: update.apiKey }),
    },
  };
  const filePath = getModProvidersPath();
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2));
  await fs.rename(tempPath, filePath);
  return next;
}

/**
 * Remove API key for a provider.
 */
export async function resetProviderKey(
  provider: ModProvider,
): Promise<ModProvidersFile> {
  return saveProviderSettings(provider, { apiKey: null });
}
