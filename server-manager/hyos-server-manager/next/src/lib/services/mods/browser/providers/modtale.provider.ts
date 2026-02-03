import type { ModProviderAdapter } from "./provider.interface";
import type {
  BrowsedMod,
  ModVersion,
  ProviderSearchResult,
  SearchParams,
} from "../types";
import {
  searchModtale,
  getModtaleModDetails,
  downloadModtaleFile,
} from "./modtale.service";
import type { MtMod, MtFile, MtProjectListItem } from "./modtale.types";

export class ModtaleProvider implements ModProviderAdapter {
  readonly id = "modtale" as const;
  readonly name = "Modtale";
  readonly authType = "api_key" as const;

  private apiKey: string | null = null;

  setApiKey(key: string | null): void {
    this.apiKey = key;
  }

  isConfigured(): boolean {
    return true;
  }

  async search(params: SearchParams): Promise<ProviderSearchResult> {
    const response = await searchModtale(
      this.apiKey,
      params.query,
      params.sort,
      params.page,
      params.pageSize,
    );

    return {
      provider: this.id,
      results: response.content.map((mod) => this.mapListItemToBrowsedMod(mod)),
      totalCount: response.totalElements,
      hasMore: response.totalPages > 0 && params.page + 1 < response.totalPages,
    };
  }

  async getModDetails(modId: string): Promise<BrowsedMod> {
    const mod = await getModtaleModDetails(this.apiKey, modId);
    return this.mapToBrowsedMod(mod);
  }

  async getModVersions(modId: string): Promise<ModVersion[]> {
    const mod = await getModtaleModDetails(this.apiKey, modId);
    return (mod.versions ?? []).map((file) => this.mapToModVersion(file));
  }

  async downloadMod(
    version: ModVersion,
  ): Promise<{ fileName: string; data: Buffer }> {
    if (!version.downloadUrl) {
      throw new Error("Download URL not available");
    }

    const buffer = await downloadModtaleFile(this.apiKey, version.downloadUrl);
    return {
      fileName: version.fileName,
      data: Buffer.from(buffer),
    };
  }

  /** Map list item (GET /projects) to BrowsedMod. Handles both summary (downloads, tags) and full (slug, versions). */
  private mapListItemToBrowsedMod(item: MtProjectListItem): BrowsedMod {
    const downloadCount = item.downloads ?? item.downloadCount ?? 0;
    const categories = item.tags ?? item.categories ?? [];
    const latestFile = item.versions?.[0];
    return {
      id: item.id,
      provider: this.id,
      name: item.title,
      summary: item.description ?? "",
      authors: [item.author],
      downloadCount,
      categories,
      iconUrl: item.imageUrl ?? null,
      websiteUrl: `https://modtale.net/project/${item.slug ?? item.id}`,
      latestVersion: latestFile ? this.mapListItemVersionToModVersion(latestFile) : null,
      updatedAt: item.updatedAt ?? "",
    };
  }

  private mapListItemVersionToModVersion(file: {
    id: string;
    versionNumber: string;
    fileUrl?: string;
    downloadUrl?: string;
    supportedVersions?: string[];
    channel?: "RELEASE" | "BETA" | "ALPHA";
  }): ModVersion {
    const fileUrl = file.fileUrl ?? file.downloadUrl;
    const fileName = fileUrl
      ? (fileUrl.split("/").pop() ?? `${file.versionNumber}.jar`)
      : `${file.versionNumber}.jar`;
    const releaseType =
      file.channel === "BETA"
        ? "beta"
        : file.channel === "ALPHA"
          ? "alpha"
          : "release";
    const downloadUrl = fileUrl
      ? fileUrl.startsWith("http")
        ? fileUrl
        : `https://cdn.modtale.net/${fileUrl.replace(/^\//, "")}`
      : null;
    return {
      fileId: file.id,
      fileName,
      displayName: file.versionNumber,
      downloadUrl,
      gameVersions: file.supportedVersions ?? [],
      releaseType,
      fileSize: 0,
    };
  }

  /** Map full project (GET /projects/{id}) to BrowsedMod. */
  private mapToBrowsedMod(mod: MtMod): BrowsedMod {
    const latestFile = mod.versions?.[0];
    const downloadCount =
      mod.downloadCount ??
      (mod.versions?.reduce((s, v) => s + (v.downloadCount ?? 0), 0) ?? 0);

    return {
      id: mod.id,
      provider: this.id,
      name: mod.title,
      summary: mod.description ?? "",
      authors: [mod.author],
      downloadCount,
      categories: mod.tags ?? [],
      iconUrl: mod.imageUrl ?? null,
      websiteUrl: `https://modtale.net/project/${mod.slug ?? mod.id}`,
      latestVersion: latestFile ? this.mapToModVersion(latestFile) : null,
      updatedAt: mod.updatedAt ?? "",
    };
  }

  private mapToModVersion(file: MtFile): ModVersion {
    const fileUrl = file.fileUrl;
    const fileName = fileUrl
      ? (fileUrl.split("/").pop() ?? `${file.versionNumber}.jar`)
      : `${file.versionNumber}.jar`;

    const releaseType =
      file.channel === "BETA"
        ? "beta"
        : file.channel === "ALPHA"
          ? "alpha"
          : "release";

    const downloadUrl = fileUrl
      ? fileUrl.startsWith("http")
        ? fileUrl
        : `https://cdn.modtale.net/${fileUrl.replace(/^\//, "")}`
      : null;

    return {
      fileId: file.id,
      fileName,
      displayName: file.versionNumber,
      downloadUrl,
      gameVersions: file.supportedVersions ?? [],
      releaseType,
      fileSize: 0,
    };
  }
}
