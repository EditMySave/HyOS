import { z } from "zod";

export const managerConfigSchema = z.object({
  serverHost: z.string().default("hyos"),
  serverPort: z.coerce.number().default(8080),
  containerName: z.string().default("hyos"),
  apiClientId: z.string().default("hyos-manager"),
  apiClientSecret: z.string().optional(),
  stateDir: z.string().default("/data/.state"),
  setupComplete: z.boolean().default(false),
  createdAt: z.string().nullable().default(null),
  updatedAt: z.string().nullable().default(null),
});

export type ManagerConfig = z.infer<typeof managerConfigSchema>;

export const managerConfigUpdateSchema = managerConfigSchema
  .partial()
  .omit({ createdAt: true });

export type ManagerConfigUpdate = z.infer<typeof managerConfigUpdateSchema>;

export const configGetResponseSchema = managerConfigSchema
  .omit({ apiClientSecret: true })
  .extend({
    hasSecret: z.boolean(),
    configuredVia: z.enum(["file", "environment"]).optional(),
  });

export type ConfigGetResponse = z.infer<typeof configGetResponseSchema>;
