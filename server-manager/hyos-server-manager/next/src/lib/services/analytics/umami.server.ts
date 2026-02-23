import umami from "@umami/node";
import { loadConfig } from "@/lib/services/config/config.loader";

const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;
const hostUrl = process.env.UMAMI_HOST;

let initialized = false;
let enabledCache: boolean | null = null;

function ensureInit() {
  if (!initialized && websiteId && hostUrl) {
    umami.init({ websiteId, hostUrl });
    initialized = true;
  }
}

async function isEnabled(): Promise<boolean> {
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

export async function trackServerError(error: unknown, context?: string) {
  if (!(await isEnabled())) return;

  ensureInit();
  if (!initialized) return;

  const err = error instanceof Error ? error : new Error(String(error));
  await umami
    .track({
      url: context ?? "/api/unknown",
      name: "server-error",
      data: {
        message: err.message?.substring(0, 500),
        stack: err.stack?.substring(0, 500) ?? "",
        context: context ?? "unknown",
      },
    })
    .catch(() => {}); // fire-and-forget, never throw
}
