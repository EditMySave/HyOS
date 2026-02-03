import {
  nxModSchema,
  nxUpdatedModSchema,
  nxFilesResponseSchema,
  nxDownloadLinkSchema,
} from "./nexusmods.types";
import type { NxMod, NxFile, NxDownloadLink } from "./nexusmods.types";
import { z } from "zod";

const MAX_MODS_TO_FETCH = 50;
const DETAILS_BATCH_SIZE = 5;

const NEXUSMODS_API = "https://api.nexusmods.com/v1";
const HYTALE_GAME_DOMAIN = "hytale";
const USER_AGENT = "HyOS-Server-Manager/1.0 (Node)";

function nexusHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    apikey: apiKey,
    "User-Agent": USER_AGENT,
  };
}

export async function searchNexusMods(
  apiKey: string,
  query: string,
): Promise<NxMod[]> {
  // updated.json returns minimal entries (mod_id + timestamps), not full mods (Nexus Mods Public API / node-nexus-api)
  const response = await fetch(
    `${NEXUSMODS_API}/games/${HYTALE_GAME_DOMAIN}/mods/updated.json?period=1m`,
    { headers: nexusHeaders(apiKey) },
  );

  if (!response.ok) {
    throw new Error(`NexusMods API error: ${response.status}`);
  }

  const data = await response.json();
  const updates = z
    .union([
      z.array(nxUpdatedModSchema),
      z
        .object({ updates: z.array(nxUpdatedModSchema) })
        .transform((o) => o.updates),
    ])
    .parse(data);
  const modIds = updates
    .slice(0, MAX_MODS_TO_FETCH)
    .map((u) => u.mod_id)
    .filter((id, i, a) => a.indexOf(id) === i);

  const mods: NxMod[] = [];
  for (let i = 0; i < modIds.length; i += DETAILS_BATCH_SIZE) {
    const batch = modIds.slice(i, i + DETAILS_BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) => getNexusModDetails(apiKey, id)),
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        mods.push(result.value);
      }
      // Skip mods that fail to fetch (deleted, hidden, or API errors)
    }
  }

  // Filter out mods with placeholder data (failed to fetch properly)
  const validMods = mods.filter((mod) => mod.name !== "Unknown Mod");

  if (!query) return validMods;
  const lowerQuery = query.toLowerCase();
  return validMods.filter(
    (mod) =>
      mod.name.toLowerCase().includes(lowerQuery) ||
      mod.summary.toLowerCase().includes(lowerQuery),
  );
}

export async function getNexusModDetails(
  apiKey: string,
  modId: number,
): Promise<NxMod> {
  const response = await fetch(
    `${NEXUSMODS_API}/games/${HYTALE_GAME_DOMAIN}/mods/${modId}.json`,
    { headers: nexusHeaders(apiKey) },
  );

  if (!response.ok) {
    throw new Error(`NexusMods API error: ${response.status}`);
  }

  const data = await response.json();
  return nxModSchema.parse(data);
}

export async function getNexusModFiles(
  apiKey: string,
  modId: number,
): Promise<NxFile[]> {
  const response = await fetch(
    `${NEXUSMODS_API}/games/${HYTALE_GAME_DOMAIN}/mods/${modId}/files.json`,
    { headers: nexusHeaders(apiKey) },
  );

  if (!response.ok) {
    throw new Error(`NexusMods API error: ${response.status}`);
  }

  const data = await response.json();
  return nxFilesResponseSchema.parse(data).files;
}

export async function getNexusDownloadLinks(
  apiKey: string,
  modId: number,
  fileId: number,
): Promise<NxDownloadLink[]> {
  const response = await fetch(
    `${NEXUSMODS_API}/games/${HYTALE_GAME_DOMAIN}/mods/${modId}/files/${fileId}/download_link.json`,
    { headers: nexusHeaders(apiKey) },
  );

  if (!response.ok) {
    throw new Error(`NexusMods API error: ${response.status}`);
  }

  const data = await response.json();
  return z.array(nxDownloadLinkSchema).parse(data);
}

export async function downloadNexusFile(
  downloadUrl: string,
  apiKey: string,
): Promise<ArrayBuffer> {
  const response = await fetch(downloadUrl, {
    headers: nexusHeaders(apiKey),
  });

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }

  return response.arrayBuffer();
}
