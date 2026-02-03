import { mtPageResponseSchema, mtModSchema } from "./modtale.types";
import type { MtMod, MtFile, MtPageResponse } from "./modtale.types";

const MODTALE_API = "https://api.modtale.net/api/v1";
const MODTALE_CDN = "https://cdn.modtale.net";

const SORT_MAP = {
  relevance: "relevance",
  downloads: "downloads",
  updated: "updated",
  name: "name",
} as const;

export async function searchModtale(
  apiKey: string | null,
  query: string,
  sort: keyof typeof SORT_MAP = "downloads",
  page = 0,
  pageSize = 20,
): Promise<MtPageResponse> {
  const params = new URLSearchParams({
    search: query,
    sort: SORT_MAP[sort],
    page: page.toString(),
    size: pageSize.toString(),
  });

  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (apiKey) {
    (headers as Record<string, string>)["X-MODTALE-KEY"] = apiKey;
  }

  const response = await fetch(`${MODTALE_API}/projects?${params}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Modtale API error: ${response.status}`);
  }

  const data = await response.json();
  return mtPageResponseSchema.parse(data);
}

export async function getModtaleModDetails(
  apiKey: string | null,
  modId: string,
): Promise<MtMod> {
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (apiKey) {
    (headers as Record<string, string>)["X-MODTALE-KEY"] = apiKey;
  }

  const response = await fetch(`${MODTALE_API}/projects/${modId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Modtale API error: ${response.status}`);
  }

  const data = await response.json();
  return mtModSchema.parse(data);
}

export async function downloadModtaleFile(
  apiKey: string | null,
  downloadUrl: string,
): Promise<ArrayBuffer> {
  const fullUrl = downloadUrl.startsWith("http")
    ? downloadUrl
    : `${MODTALE_CDN}/${downloadUrl}`;

  const headers: HeadersInit = {};
  if (apiKey) {
    (headers as Record<string, string>)["X-MODTALE-KEY"] = apiKey;
  }

  const response = await fetch(fullUrl, { headers });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  return response.arrayBuffer();
}
