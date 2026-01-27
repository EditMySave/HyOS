import { promises as fs } from "node:fs";
import path from "node:path";
import {
  type ManagerConfig,
  type ManagerConfigUpdate,
  managerConfigSchema,
  managerConfigUpdateSchema,
} from "./config.types";

const CONFIG_FILE = "manager-config.json";

function defaultStateDir(): string {
  return process.env.NODE_ENV === "production"
    ? "/data/.state"
    : "/tmp/hytale-state";
}

export function getConfigPath(): string {
  const stateDir = process.env.HYTALE_STATE_DIR ?? defaultStateDir();
  return path.join(stateDir, CONFIG_FILE);
}

function defaults(): ManagerConfig {
  return {
    serverHost: "hyos",
    serverPort: 8080,
    containerName: "hyos",
    apiClientId: "hyos-manager",
    stateDir: defaultStateDir(),
    setupComplete: false,
    createdAt: null,
    updatedAt: null,
  };
}

function fromEnv(): Partial<ManagerConfig> {
  const stateDir = process.env.HYTALE_STATE_DIR ?? defaultStateDir();
  const port = process.env.HYTALE_SERVER_PORT;
  const secret =
    process.env.REST_API_CLIENT_SECRET ?? process.env.API_CLIENT_SECRET;
  return {
    serverHost: process.env.HYTALE_SERVER_HOST ?? undefined,
    serverPort: port !== undefined ? Number.parseInt(port, 10) : undefined,
    containerName: process.env.HYTALE_CONTAINER_NAME ?? undefined,
    apiClientId:
      process.env.REST_API_CLIENT_ID ?? process.env.API_CLIENT_ID ?? undefined,
    apiClientSecret: secret ?? undefined,
    stateDir,
  };
}

async function readFileConfig(): Promise<Partial<ManagerConfig> | null> {
  try {
    const configPath = getConfigPath();
    const content = await fs.readFile(configPath, "utf8");
    const raw = JSON.parse(content) as Record<string, unknown>;
    return raw as Partial<ManagerConfig>;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return null;
    console.error("Failed to read manager config:", err);
    return null;
  }
}

function hasEnvCredentials(): boolean {
  return !!(
    process.env.REST_API_CLIENT_SECRET ?? process.env.API_CLIENT_SECRET
  );
}

export async function getConfiguredVia(): Promise<
  "file" | "environment" | null
> {
  const file = await readFileConfig();
  if (file?.setupComplete) return "file";
  if (hasEnvCredentials()) return "environment";
  return null;
}

/**
 * Load config with priority: defaults → env → file (file wins).
 */
export async function loadConfig(): Promise<ManagerConfig> {
  const base = { ...defaults(), ...fromEnv() };
  const file = await readFileConfig();
  const merged = { ...base, ...file };
  return managerConfigSchema.parse(merged);
}

/**
 * Save config updates to file (atomic write). Merges over existing.
 */
export async function saveConfig(
  update: ManagerConfigUpdate,
): Promise<ManagerConfig> {
  const parsed = managerConfigUpdateSchema.safeParse(update);
  if (!parsed.success) {
    throw new Error(
      `Invalid config update: ${JSON.stringify(parsed.error.issues)}`,
    );
  }
  const partial = parsed.data;

  if (
    typeof partial.apiClientSecret === "string" &&
    partial.apiClientSecret.length < 8
  ) {
    throw new Error("Password must be at least 8 characters");
  }

  const existing = await loadConfig();
  const now = new Date().toISOString();
  const next: ManagerConfig = {
    ...existing,
    ...partial,
    createdAt: existing.createdAt ?? now,
    updatedAt: now,
  };
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
  const tempPath = `${configPath}.tmp`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2));
  await fs.rename(tempPath, configPath);
  return next;
}

/**
 * Delete config file. Next loadConfig() reverts to env/defaults.
 */
export async function resetConfig(): Promise<void> {
  try {
    await fs.unlink(getConfigPath());
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "ENOENT") return;
    throw err;
  }
}
