import type { ModProvider } from "./browser/types";
import type {
  ProviderSettingsResponse,
  SaveProviderSettingsRequest,
} from "./providers.types";
import {
  providerSettingsResponseSchema,
  saveProviderSettingsRequestSchema,
} from "./providers.types";

export async function getProviderSettings(): Promise<ProviderSettingsResponse> {
  const response = await fetch("/api/mods/providers/settings");
  if (!response.ok) {
    throw new Error(
      `Failed to fetch provider settings: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return providerSettingsResponseSchema.parse(data);
}

export async function saveProviderSettings(
  request: SaveProviderSettingsRequest,
): Promise<ProviderSettingsResponse> {
  const parsed = saveProviderSettingsRequestSchema.safeParse(request);
  if (!parsed.success) {
    throw new Error(`Invalid request: ${JSON.stringify(parsed.error.issues)}`);
  }
  const response = await fetch("/api/mods/providers/settings", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(parsed.data),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string })?.error ??
        `Failed to save provider settings: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return providerSettingsResponseSchema.parse(data);
}

export async function resetProviderKey(
  provider: ModProvider,
): Promise<ProviderSettingsResponse> {
  const response = await fetch(`/api/mods/providers/settings/${provider}/key`, {
    method: "DELETE",
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string })?.error ??
        `Failed to reset API key: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return providerSettingsResponseSchema.parse(data);
}
