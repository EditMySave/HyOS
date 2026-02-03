import { z } from "zod";

// ============================================================================
// Provider identification
// ============================================================================

export const modProviderSchema = z.enum(["curseforge", "modtale", "nexusmods"]);
export type ModProvider = z.infer<typeof modProviderSchema>;

// ============================================================================
// Provider configuration (stored in localStorage via Zustand)
// ============================================================================

export const providerConfigSchema = z.object({
  curseforge: z.object({
    enabled: z.boolean(),
    apiKey: z.string().nullable(),
  }),
  modtale: z.object({
    enabled: z.boolean(),
    apiKey: z.string().nullable(),
  }),
  nexusmods: z.object({
    enabled: z.boolean(),
    apiKey: z.string().nullable(),
  }),
});
export type ProviderConfig = z.infer<typeof providerConfigSchema>;

// ============================================================================
// Unified mod representation
// ============================================================================

export const modVersionSchema = z.object({
  fileId: z.string(),
  fileName: z.string(),
  displayName: z.string(),
  downloadUrl: z.string().nullable(),
  gameVersions: z.array(z.string()),
  releaseType: z.enum(["release", "beta", "alpha"]),
  fileSize: z.number(),
});
export type ModVersion = z.infer<typeof modVersionSchema>;

export const browsedModSchema = z.object({
  id: z.string(),
  provider: modProviderSchema,
  name: z.string(),
  summary: z.string(),
  authors: z.array(z.string()),
  downloadCount: z.number(),
  categories: z.array(z.string()),
  iconUrl: z.string().nullable(),
  websiteUrl: z.string(),
  latestVersion: modVersionSchema.nullable(),
  updatedAt: z.string(),
});
export type BrowsedMod = z.infer<typeof browsedModSchema>;

// ============================================================================
// Search parameters
// ============================================================================

export const searchParamsSchema = z.object({
  query: z.string(),
  providers: z.array(modProviderSchema),
  sort: z.enum(["relevance", "downloads", "updated", "name"]),
  page: z.number(),
  pageSize: z.number(),
});
export type SearchParams = z.infer<typeof searchParamsSchema>;

// ============================================================================
// Provider search result (per-provider)
// ============================================================================

export const providerPaginationSchema = z.object({
  provider: modProviderSchema,
  totalCount: z.number(),
  hasMore: z.boolean(),
});
export type ProviderPagination = z.infer<typeof providerPaginationSchema>;

export interface ProviderSearchResult {
  provider: ModProvider;
  results: BrowsedMod[];
  totalCount: number;
  hasMore: boolean;
}

// ============================================================================
// Aggregated results
// ============================================================================

export const aggregatedSearchResultSchema = z.object({
  results: z.array(browsedModSchema),
  pagination: z.array(providerPaginationSchema),
  errors: z.array(
    z.object({
      provider: modProviderSchema,
      error: z.string(),
    }),
  ),
});
export type AggregatedSearchResult = z.infer<
  typeof aggregatedSearchResultSchema
>;
