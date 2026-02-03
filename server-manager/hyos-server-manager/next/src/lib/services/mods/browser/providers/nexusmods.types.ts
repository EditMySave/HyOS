import { z } from "zod";

export const nxUserSchema = z.object({
  member_id: z.number(),
  member_group_id: z.number(),
  name: z.string(),
});

export const nxEndorsementSchema = z.object({
  endorse_status: z.string(),
  timestamp: z.number().nullable(),
  version: z.string().nullable(),
});

/** Response item from GET .../mods/updated.json (mod IDs + timestamps only; API may return object or raw mod_id) */
export const nxUpdatedModSchema = z.union([
  z.object({
    mod_id: z.number(),
    latest_file_update: z.number().optional(),
    latest_mod_activity: z.number().optional(),
  }),
  z.number().transform((n) => ({ mod_id: n })),
]);

export const nxModSchema = z.object({
  mod_id: z.number(),
  game_id: z.number().optional().default(0),
  domain_name: z.string().optional().default("hytale"),
  name: z.string().optional().default("Unknown Mod"),
  summary: z.string().optional().default(""),
  version: z.string().optional().default(""),
  author: z.string().optional().default("Unknown"),
  uploaded_by: z.string().optional().default("Unknown"),
  uploaded_users_profile_url: z.string().optional().default(""),
  created_timestamp: z.number().optional().default(0),
  updated_timestamp: z.number().optional().default(0),
  available: z.boolean().optional().default(true),
  picture_url: z.string().nullable().optional().default(null),
  endorsement_count: z.number().optional().default(0),
  mod_downloads: z.number().optional().default(0),
  mod_unique_downloads: z.number().optional().default(0),
  uid: z.number().optional().default(0),
  category_id: z.number().optional().default(0),
  status: z.string().optional().default("published"),
  contains_adult_content: z.boolean().optional().default(false),
});

export const nxFileSchema = z.object({
  id: z.array(z.number()),
  uid: z.number(),
  file_id: z.number(),
  name: z.string(),
  version: z.string(),
  category_id: z.number(),
  category_name: z.string().nullable(),
  is_primary: z.boolean(),
  size: z.number(),
  file_name: z.string(),
  uploaded_timestamp: z.number(),
  mod_version: z.string(),
  external_virus_scan_url: z.string().nullable(),
  description: z.string(),
  size_kb: z.number(),
  changelog_html: z.string().nullable(),
});

export const nxFilesResponseSchema = z.object({
  files: z.array(nxFileSchema),
  file_updates: z.array(z.unknown()),
});

export const nxDownloadLinkSchema = z.object({
  name: z.string(),
  short_name: z.string(),
  URI: z.string(),
});

export type NxUpdatedMod = z.infer<typeof nxUpdatedModSchema>;
export type NxMod = z.infer<typeof nxModSchema>;
export type NxFile = z.infer<typeof nxFileSchema>;
export type NxDownloadLink = z.infer<typeof nxDownloadLinkSchema>;
