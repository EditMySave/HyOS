import { z } from "zod";

export const groupEntrySchema = z.object({
  permissions: z.array(z.string()),
});

export const userEntrySchema = z.object({
  groups: z.array(z.string()),
  permissions: z.array(z.string()),
});

export const permissionsDataSchema = z.object({
  groups: z.record(z.string(), groupEntrySchema),
  users: z.record(z.string(), userEntrySchema),
});

export const groupResponseSchema = z.object({
  name: z.string(),
  permissions: z.array(z.string()),
});

export const commandResponseSchema = z.object({
  success: z.boolean(),
  output: z.string(),
});

export type GroupEntry = z.infer<typeof groupEntrySchema>;
export type UserEntry = z.infer<typeof userEntrySchema>;
export type PermissionsData = z.infer<typeof permissionsDataSchema>;
export type GroupResponse = z.infer<typeof groupResponseSchema>;
export type CommandResponse = z.infer<typeof commandResponseSchema>;
