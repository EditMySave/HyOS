import type {
  BrowsedMod,
  ModVersion,
  ProviderSearchResult,
  SearchParams,
} from "../types";
import {
  downloadCurseForgeFile,
  getCurseForgeModDetails,
  getCurseForgeModFiles,
  searchCurseForge,
} from "./curseforge.service";
import type { CfMod, CfModFile } from "./curseforge.types";
import type { ModProviderAdapter } from "./provider.interface";

export class CurseForgeProvider implements ModProviderAdapter {
  readonly id = "curseforge" as const;
  readonly name = "CurseForge";
  readonly authType = "api_key" as const;

  private apiKey: string | null = null;

  setApiKey(key: string | null): void {
    this.apiKey = key;
  }

  isConfigured(): boolean {
    return this.apiKey !== null && this.apiKey.length > 0;
  }

  async search(params: SearchParams): Promise<ProviderSearchResult> {
    if (!this.apiKey) throw new Error("CurseForge API key not configured");

    const response = await searchCurseForge(
      this.apiKey,
      params.query,
      params.sort,
      params.page,
      params.pageSize,
    );

    return {
      provider: this.id,
      results: response.data.map((mod) => this.mapToBrowsedMod(mod)),
      totalCount: response.pagination?.totalCount ?? response.data.length,
      hasMore: response.pagination
        ? response.pagination.index + response.pagination.pageSize <
          response.pagination.totalCount
        : false,
    };
  }

  async getModDetails(modId: string): Promise<BrowsedMod> {
    if (!this.apiKey) throw new Error("CurseForge API key not configured");
    const mod = await getCurseForgeModDetails(
      this.apiKey,
      Number.parseInt(modId, 10),
    );
    return this.mapToBrowsedMod(mod);
  }

  async getModVersions(modId: string): Promise<ModVersion[]> {
    if (!this.apiKey) throw new Error("CurseForge API key not configured");
    const files = await getCurseForgeModFiles(
      this.apiKey,
      Number.parseInt(modId, 10),
    );
    return files.map((file) => this.mapToModVersion(file));
  }

  async downloadMod(
    version: ModVersion,
  ): Promise<{ fileName: string; data: Buffer }> {
    if (!this.apiKey) throw new Error("CurseForge API key not configured");
    if (!version.downloadUrl) {
      throw new Error(
        "Download URL not available - author has disabled API downloads",
      );
    }

    const buffer = await downloadCurseForgeFile(
      this.apiKey,
      version.downloadUrl,
    );
    return {
      fileName: version.fileName,
      data: Buffer.from(buffer),
    };
  }

  private mapToBrowsedMod(mod: CfMod): BrowsedMod {
    const latestFile =
      mod.latestFiles.find((f) => f.releaseType === 1) ?? mod.latestFiles[0];

    return {
      id: mod.id.toString(),
      provider: this.id,
      name: mod.name,
      summary: mod.summary,
      authors: mod.authors.map((a) => a.name),
      downloadCount: mod.downloadCount,
      categories: mod.categories.map((c) => c.name),
      iconUrl: mod.logo?.thumbnailUrl ?? null,
      websiteUrl: mod.links.websiteUrl,
      latestVersion: latestFile ? this.mapToModVersion(latestFile) : null,
      updatedAt: mod.dateModified,
    };
  }

  private mapToModVersion(file: CfModFile): ModVersion {
    return {
      fileId: file.id.toString(),
      fileName: file.fileName,
      displayName: file.displayName,
      downloadUrl: file.downloadUrl,
      gameVersions: file.gameVersions,
      releaseType:
        file.releaseType === 1
          ? "release"
          : file.releaseType === 2
            ? "beta"
            : "alpha",
      fileSize: file.fileLength,
    };
  }
}
