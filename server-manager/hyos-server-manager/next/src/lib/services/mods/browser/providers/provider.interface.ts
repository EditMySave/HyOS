import type {
  BrowsedMod,
  ModProvider,
  ModVersion,
  ProviderSearchResult,
  SearchParams,
} from "../types";

export interface ModProviderAdapter {
  readonly id: ModProvider;
  readonly name: string;
  readonly authType: "api_key" | "oauth" | "sso";

  setApiKey(key: string | null): void;
  isConfigured(): boolean;
  getAuthUrl?(): string;

  search(params: SearchParams): Promise<ProviderSearchResult>;
  getModDetails(modId: string): Promise<BrowsedMod>;
  getModVersions(modId: string): Promise<ModVersion[]>;

  downloadMod(version: ModVersion): Promise<{ fileName: string; data: Buffer }>;
}
