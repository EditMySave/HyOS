import {
  type ConfigGetResponse,
  configGetResponseSchema,
  type ManagerConfigUpdate,
} from "./config.types";

export async function getConfig(): Promise<ConfigGetResponse> {
  const response = await fetch("/api/config");
  if (!response.ok) {
    throw new Error(`Failed to fetch config: ${response.statusText}`);
  }
  const data = await response.json();
  return configGetResponseSchema.parse(data);
}

export async function updateConfig(
  update: ManagerConfigUpdate,
): Promise<ConfigGetResponse> {
  const response = await fetch("/api/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string })?.error ??
        `Failed to update config: ${response.statusText}`,
    );
  }
  const data = await response.json();
  return configGetResponseSchema.parse(data);
}

export async function resetConfig(): Promise<void> {
  const response = await fetch("/api/config", { method: "DELETE" });
  if (!response.ok) {
    throw new Error(`Failed to reset config: ${response.statusText}`);
  }
}
