import umami from "@umami/node";
import { loadConfig } from "@/lib/services/config/config.loader";

const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const hostUrl = process.env.UMAMI_HOST ?? "https://stats.hyos.io";

let initialized = false;
let enabledCache: boolean | null = null;

export interface ErrorContext {
  method?: string;
  url?: string;
  statusCode?: number;
  category?:
    | "docker"
    | "filesystem"
    | "auth"
    | "validation"
    | "network"
    | "render"
    | "unknown";
  route?: string;
}

export function ensureInit() {
  if (!initialized && websiteId && hostUrl) {
    umami.init({ websiteId, hostUrl });
    initialized = true;
  }
}

export async function isEnabled(): Promise<boolean> {
  if (!websiteId || !hostUrl) return false;
  if (enabledCache !== null) return enabledCache;

  try {
    const config = await loadConfig();
    enabledCache = config.telemetryEnabled;
    // Cache for 5 minutes then re-check
    setTimeout(
      () => {
        enabledCache = null;
      },
      5 * 60 * 1000,
    );
    return enabledCache;
  } catch {
    return true; // Default to enabled if config can't be read
  }
}

export function classifyError(
  error: unknown,
): ErrorContext["category"] {
  if (!(error instanceof Error)) return "unknown";

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Docker/Dockerode errors
  if (
    name.includes("docker") ||
    message.includes("docker") ||
    message.includes("dockerode") ||
    message.includes("container") ||
    message.includes("econnrefused") ||
    message.includes("/var/run/docker.sock")
  ) {
    return "docker";
  }

  // Filesystem errors
  if (
    name === "enoent" ||
    name === "eacces" ||
    message.includes("enoent") ||
    message.includes("eacces") ||
    message.includes("no such file") ||
    message.includes("permission denied") ||
    (error as NodeJS.ErrnoException).code === "ENOENT" ||
    (error as NodeJS.ErrnoException).code === "EACCES" ||
    (error as NodeJS.ErrnoException).code === "EISDIR" ||
    (error as NodeJS.ErrnoException).code === "EPERM"
  ) {
    return "filesystem";
  }

  // Auth/session errors
  if (
    message.includes("session") ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("iron-session") ||
    message.includes("token")
  ) {
    return "auth";
  }

  // Zod/validation errors
  if (
    name === "zoderror" ||
    message.includes("validation") ||
    message.includes("parse") ||
    message.includes("invalid")
  ) {
    return "validation";
  }

  // Network errors
  if (
    message.includes("fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("abort") ||
    message.includes("econnreset") ||
    (error as NodeJS.ErrnoException).code === "ECONNREFUSED" ||
    (error as NodeJS.ErrnoException).code === "ECONNRESET" ||
    (error as NodeJS.ErrnoException).code === "ETIMEDOUT"
  ) {
    return "network";
  }

  return "unknown";
}

export async function trackServerError(
  error: unknown,
  context?: string | ErrorContext,
) {
  if (!(await isEnabled())) return;

  ensureInit();
  if (!initialized) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const ctx: ErrorContext =
    typeof context === "string" ? { route: context, url: context } : (context ?? {});
  const category = ctx.category ?? classifyError(error);

  await umami
    .track({
      url: ctx.url ?? ctx.route ?? "/api/unknown",
      name: "server-error",
      data: {
        message: err.message?.substring(0, 500),
        stack: err.stack?.substring(0, 500) ?? "",
        method: ctx.method ?? "",
        route: ctx.route ?? "",
        url: ctx.url ?? "",
        statusCode: ctx.statusCode ?? 500,
        category,
        errorName: err.name ?? "",
        timestamp: new Date().toISOString(),
      },
    })
    .catch(() => {}); // fire-and-forget, never throw
}

export async function trackServerWarning(
  error: unknown,
  context?: string | ErrorContext,
) {
  if (!(await isEnabled())) return;

  ensureInit();
  if (!initialized) return;

  const err = error instanceof Error ? error : new Error(String(error));
  const ctx: ErrorContext =
    typeof context === "string" ? { route: context, url: context } : (context ?? {});
  const category = ctx.category ?? classifyError(error);

  await umami
    .track({
      url: ctx.url ?? ctx.route ?? "/api/unknown",
      name: "server-warning",
      data: {
        message: err.message?.substring(0, 500),
        stack: err.stack?.substring(0, 500) ?? "",
        method: ctx.method ?? "",
        route: ctx.route ?? "",
        url: ctx.url ?? "",
        statusCode: ctx.statusCode ?? 200,
        category,
        errorName: err.name ?? "",
        timestamp: new Date().toISOString(),
      },
    })
    .catch(() => {}); // fire-and-forget, never throw
}
