import { z } from "zod";

export const cfAuthorSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string(),
});

export const cfCategorySchema = z.object({
  id: z.number(),
  gameId: z.number(),
  name: z.string(),
  slug: z.string(),
  url: z.string(),
  iconUrl: z.string(),
});

export const cfFileHashSchema = z.object({
  value: z.string(),
  algo: z.number(),
});

export const cfFileDependencySchema = z.object({
  modId: z.number(),
  relationType: z.number(),
});

export const cfModFileSchema = z.object({
  id: z.number(),
  gameId: z.number(),
  modId: z.number(),
  isAvailable: z.boolean(),
  displayName: z.string(),
  fileName: z.string(),
  releaseType: z.number(),
  fileStatus: z.number(),
  hashes: z.array(cfFileHashSchema),
  fileDate: z.string(),
  fileLength: z.number(),
  downloadCount: z.number(),
  downloadUrl: z.string().nullable(),
  gameVersions: z.array(z.string()),
  dependencies: z.array(cfFileDependencySchema),
});

export const cfModAssetSchema = z.object({
  id: z.number(),
  modId: z.number(),
  title: z.string(),
  description: z.string(),
  thumbnailUrl: z.string(),
  url: z.string(),
});

export const cfModLinksSchema = z.object({
  websiteUrl: z.string(),
  wikiUrl: z.string().nullable(),
  issuesUrl: z.string().nullable(),
  sourceUrl: z.string().nullable(),
});

export const cfModSchema = z.object({
  id: z.number(),
  gameId: z.number(),
  name: z.string(),
  slug: z.string(),
  links: cfModLinksSchema,
  summary: z.string(),
  status: z.number(),
  downloadCount: z.number(),
  isFeatured: z.boolean(),
  primaryCategoryId: z.number().nullable(),
  categories: z.array(cfCategorySchema),
  classId: z.number().nullable(),
  authors: z.array(cfAuthorSchema),
  logo: cfModAssetSchema.nullable(),
  screenshots: z.array(cfModAssetSchema),
  mainFileId: z.number(),
  latestFiles: z.array(cfModFileSchema),
  dateCreated: z.string(),
  dateModified: z.string(),
  dateReleased: z.string(),
  allowModDistribution: z.boolean().nullable(),
  gamePopularityRank: z.number().nullable(),
  isAvailable: z.boolean().nullable(),
  thumbsUpCount: z.number().nullable(),
});

export const cfPaginationSchema = z.object({
  index: z.number(),
  pageSize: z.number(),
  totalCount: z.number(),
});

export const cfSearchResponseSchema = z.object({
  data: z.array(cfModSchema),
  pagination: cfPaginationSchema.optional(),
});

export const cfModResponseSchema = z.object({
  data: cfModSchema,
});

export const cfFilesResponseSchema = z.object({
  data: z.array(cfModFileSchema),
});

export type CfMod = z.infer<typeof cfModSchema>;
export type CfModFile = z.infer<typeof cfModFileSchema>;
export type CfSearchResponse = z.infer<typeof cfSearchResponseSchema>;
