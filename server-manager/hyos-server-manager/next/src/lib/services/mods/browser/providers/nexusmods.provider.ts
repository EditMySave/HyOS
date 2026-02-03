import type { ModProviderAdapter } from "./provider.interface";
import type {
  BrowsedMod,
  ModVersion,
  ProviderSearchResult,
  SearchParams,
} from "../types";
import {
  searchNexusMods,
  getNexusModDetails,
  getNexusModFiles,
  getNexusDownloadLinks,
  downloadNexusFile,
} from "./nexusmods.service";
import type { NxMod, NxFile } from "./nexusmods.types";

export class NexusModsProvider implements ModProviderAdapter {
  readonly id = "nexusmods" as const;
  readonly name = "NexusMods";
  readonly authType = "api_key" as const;

  private apiKey: string | null = null;

  setApiKey(key: string | null): void {
    this.apiKey = key;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  async search(params: SearchParams): Promise<ProviderSearchResult> {
    if (!this.apiKey) throw new Error("NexusMods API key not configured");

    const mods = await searchNexusMods(this.apiKey, params.query);

    const start = params.page * params.pageSize;
    const paged = mods.slice(start, start + params.pageSize);

    return {
      provider: this.id,
      results: paged.map((mod) => this.mapToBrowsedMod(mod)),
      totalCount: mods.length,
      hasMore: start + params.pageSize < mods.length,
    };
  }

  async getModDetails(modId: string): Promise<BrowsedMod> {
    if (!this.apiKey) throw new Error("NexusMods API key not configured");
    const mod = await getNexusModDetails(
      this.apiKey,
      Number.parseInt(modId, 10),
    );
    return this.mapToBrowsedMod(mod);
  }

  async getModVersions(modId: string): Promise<ModVersion[]> {
    if (!this.apiKey) throw new Error("NexusMods API key not configured");
    const modIdNum = Number.parseInt(modId, 10);
    const files = await getNexusModFiles(this.apiKey, modIdNum);
    return files.map((file) => this.mapToModVersion(file, modIdNum));
  }

  async downloadMod(
    version: ModVersion,
  ): Promise<{ fileName: string; data: Buffer }> {
    if (!this.apiKey) throw new Error("NexusMods API key not configured");

    const parts = version.fileId.split("-");
    const modId = Number.parseInt(parts[0] ?? "0", 10);
    const fileId = Number.parseInt(parts[1] ?? "0", 10);

    const links = await getNexusDownloadLinks(this.apiKey, modId, fileId);
    const downloadUrl = links[0]?.URI;

    if (!downloadUrl) {
      throw new Error("No download link available");
    }

    if (!this.apiKey) {
      throw new Error("NexusMods API key not configured");
    }

    const buffer = await downloadNexusFile(downloadUrl, this.apiKey);
    return {
      fileName: version.fileName,
      data: Buffer.from(buffer),
    };
  }

  private mapToBrowsedMod(mod: NxMod): BrowsedMod {
    return {
      id: mod.mod_id.toString(),
      provider: this.id,
      name: mod.name,
      summary: mod.summary,
      authors: [mod.author],
      downloadCount: mod.mod_downloads,
      categories: [],
      iconUrl: mod.picture_url,
      websiteUrl: `https://www.nexusmods.com/${mod.domain_name}/mods/${mod.mod_id}`,
      latestVersion: {
        fileId: `${mod.mod_id}-0`,
        fileName: "mod.jar",
        displayName: mod.version ?? "Latest",
        downloadUrl: null,
        gameVersions: [],
        releaseType: "release",
        fileSize: 0,
      },
      updatedAt: new Date(mod.updated_timestamp * 1000).toISOString(),
    };
  }

  private mapToModVersion(file: NxFile, modId: number): ModVersion {
    return {
      fileId: `${modId}-${file.file_id}`,
      fileName: file.file_name,
      displayName: file.name,
      downloadUrl: null,
      gameVersions: [file.mod_version],
      releaseType: file.category_name === "MAIN" ? "release" : "beta",
      fileSize: file.size_kb * 1024,
    };
  }
}
