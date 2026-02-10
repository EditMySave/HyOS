import type {
  AggregatedSearchResult,
  ModProvider,
  ModVersion,
  ProviderConfig,
  SearchParams,
} from "./types";
import { getProviders } from "./providers";

/**
 * Run aggregated search across enabled providers (server-side).
 * Used by the browse API route.
 */
export async function runSearch(
  params: SearchParams,
  providerConfig: ProviderConfig,
): Promise<AggregatedSearchResult> {
  const providers = getProviders();
  const errors: { provider: ModProvider; error: string }[] = [];
  const pagination: AggregatedSearchResult["pagination"] = [];
  const allResults: AggregatedSearchResult["results"] = [];

  const toRun: ModProvider[] = [];

  for (const id of ["curseforge", "modtale", "nexusmods"] as const) {
    const config = providerConfig[id];
    if (!config?.enabled) continue;
    if (id === "curseforge" && !config.apiKey) continue;
    if (id === "nexusmods" && !config.apiKey) continue;
    toRun.push(id);
  }

  for (const id of toRun) {
    const adapter = providers[id];
    const config = providerConfig[id];
    if (config) adapter.setApiKey(config.apiKey);
  }

  const results = await Promise.allSettled(
    toRun.map((id) => providers[id].search(params)),
  );

  for (let i = 0; i < toRun.length; i++) {
    const id = toRun[i];
    const result = results[i];
    if (!id || result === undefined) continue;

    if (result.status === "fulfilled") {
      allResults.push(...result.value.results);
      pagination.push({
        provider: id,
        totalCount: result.value.totalCount,
        hasMore: result.value.hasMore,
      });
    } else {
      errors.push({
        provider: id,
        error: result.reason?.message ?? String(result.reason),
      });
    }
  }

  allResults.sort((a, b) => b.downloadCount - a.downloadCount);

  return {
    results: allResults,
    pagination,
    errors,
  };
}

/**
 * Call from client to run aggregated search via API.
 * Provider config (including API keys) is loaded server-side from file.
 */
export async function searchAllProviders(
  params: SearchParams,
): Promise<AggregatedSearchResult> {
  const response = await fetch("/api/mods/browse", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string })?.error ?? `Search failed: ${response.status}`,
    );
  }

  const data = await response.json();
  return data as AggregatedSearchResult;
}

export interface InstallModInfo {
  name?: string;
  authors?: string[];
  summary?: string;
  iconUrl?: string | null;
  websiteUrl?: string;
  providerModId?: string;
}

/**
 * Call from client to install a mod via API.
 * API key is loaded server-side from file.
 */
export async function installMod(
  provider: ModProvider,
  version: ModVersion,
  modInfo?: InstallModInfo,
  replaceFileName?: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch("/api/mods/install", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider, version, modInfo, replaceFileName }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      (data as { error?: string })?.error ??
        `Install failed: ${response.status}`,
    );
  }

  return data as { success: boolean; message: string };
}
