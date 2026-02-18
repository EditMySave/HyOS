import type { CfMod, CfModFile, CfSearchResponse } from "./curseforge.types";
import {
  cfFilesResponseSchema,
  cfModResponseSchema,
  cfSearchResponseSchema,
} from "./curseforge.types";

const CURSEFORGE_API = "https://api.curseforge.com/v1";
const HYTALE_GAME_ID = 70216;

const SORT_FIELDS = {
  relevance: 1,
  downloads: 2,
  updated: 3,
  name: 4,
} as const;

export async function searchCurseForge(
  apiKey: string,
  query: string,
  sort: keyof typeof SORT_FIELDS = "downloads",
  page = 0,
  pageSize = 20,
): Promise<CfSearchResponse> {
  const params = new URLSearchParams({
    gameId: HYTALE_GAME_ID.toString(),
    searchFilter: query,
    pageSize: pageSize.toString(),
    index: (page * pageSize).toString(),
    sortField: SORT_FIELDS[sort].toString(),
    sortOrder: "desc",
  });

  const response = await fetch(`${CURSEFORGE_API}/mods/search?${params}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status}`);
  }

  const data = await response.json();
  return cfSearchResponseSchema.parse(data);
}

export async function getCurseForgeModDetails(
  apiKey: string,
  modId: number,
): Promise<CfMod> {
  const response = await fetch(`${CURSEFORGE_API}/mods/${modId}`, {
    headers: {
      Accept: "application/json",
      "x-api-key": apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status}`);
  }

  const data = await response.json();
  return cfModResponseSchema.parse(data).data;
}

export async function getCurseForgeModFiles(
  apiKey: string,
  modId: number,
): Promise<CfModFile[]> {
  const response = await fetch(
    `${CURSEFORGE_API}/mods/${modId}/files?pageSize=50`,
    {
      headers: {
        Accept: "application/json",
        "x-api-key": apiKey,
      },
    },
  );

  if (!response.ok) {
    throw new Error(`CurseForge API error: ${response.status}`);
  }

  const data = await response.json();
  return cfFilesResponseSchema.parse(data).data;
}

export async function downloadCurseForgeFile(
  apiKey: string,
  downloadUrl: string,
): Promise<ArrayBuffer> {
  const response = await fetch(downloadUrl, {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  return response.arrayBuffer();
}
