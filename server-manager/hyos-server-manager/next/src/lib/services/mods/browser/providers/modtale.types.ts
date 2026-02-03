import { z } from "zod";

/** Version in full project details (GET /api/v1/projects/{id}) */
export const mtFileSchema = z.object({
  id: z.string(),
  versionNumber: z.string(),
  fileUrl: z.string().optional(),
  downloadCount: z.number().optional(),
  channel: z.enum(["RELEASE", "BETA", "ALPHA"]).optional(),
  supportedVersions: z.array(z.string()).optional(),
});

/** Full project details response */
export const mtModSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  author: z.string(),
  imageUrl: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  classification: z.string().optional(),
  status: z.string().optional(),
  about: z.string().nullable().optional(),
  versions: z.array(mtFileSchema).nullable().optional(),
  galleryImages: z.array(z.string()).optional(),
  license: z.string().nullable().optional(),
  repositoryUrl: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  downloadCount: z.number().optional(),
  tags: z.array(z.string()).optional(),
});

/** Project summary in list response (GET /api/v1/projects) - doc shape */
export const mtProjectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  classification: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  downloads: z.number(),
  rating: z.number().optional(),
  updatedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

/** Permissive version shape for list items (API may omit fileUrl/downloadUrl/supportedVersions/createdAt) */
const mtListVersionSchema = z.object({
  id: z.string(),
  versionNumber: z.string(),
  fileUrl: z.string().optional(),
  downloadUrl: z.string().optional(),
  downloadCount: z.number().optional(),
  channel: z.enum(["RELEASE", "BETA", "ALPHA"]).optional(),
  supportedVersions: z.array(z.string()).optional(),
  createdAt: z.string().optional(),
});

/** List item: API can return summary (downloads, tags) or full project (slug, versions, etc.); all optional except id/title/author */
export const mtProjectListItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  classification: z.string().optional(),
  description: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  downloads: z.number().optional(),
  downloadCount: z.number().optional(),
  rating: z.number().optional(),
  updatedAt: z.string().optional(),
  tags: z.array(z.string()).optional(),
  slug: z.string().nullable().optional(),
  bannerUrl: z.string().nullable().optional(),
  categories: z.array(z.string()).optional(),
  versions: z.array(mtListVersionSchema).nullable().optional(),
});

export const mtPageResponseSchema = z.object({
  content: z.array(mtProjectListItemSchema),
  totalPages: z.number(),
  totalElements: z.number(),
});

export type MtMod = z.infer<typeof mtModSchema>;
export type MtFile = z.infer<typeof mtFileSchema>;
export type MtProjectSummary = z.infer<typeof mtProjectSummarySchema>;
export type MtProjectListItem = z.infer<typeof mtProjectListItemSchema>;
export type MtPageResponse = z.infer<typeof mtPageResponseSchema>;
