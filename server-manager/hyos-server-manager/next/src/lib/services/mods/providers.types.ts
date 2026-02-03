import { z } from "zod";
import { modProviderSchema } from "./browser/types";

export const providerSettingSchema = z.object({
  id: modProviderSchema,
  enabled: z.boolean(),
  hasApiKey: z.boolean(),
});
export type ProviderSetting = z.infer<typeof providerSettingSchema>;

export const providerSettingsResponseSchema = z.object({
  providers: z.array(providerSettingSchema),
});
export type ProviderSettingsResponse = z.infer<
  typeof providerSettingsResponseSchema
>;

export const saveProviderSettingsRequestSchema = z.object({
  provider: modProviderSchema,
  enabled: z.boolean(),
  apiKey: z.string().min(1).optional(),
});
export type SaveProviderSettingsRequest = z.infer<
  typeof saveProviderSettingsRequestSchema
>;
