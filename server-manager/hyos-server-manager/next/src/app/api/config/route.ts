import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import {
  getConfiguredVia,
  loadConfig,
  resetConfig,
  saveConfig,
} from "@/lib/services/config/config.loader";
import { managerConfigUpdateSchema } from "@/lib/services/config/config.types";

function toGetResponse(
  config: Awaited<ReturnType<typeof loadConfig>>,
  configuredVia: "file" | "environment" | null,
) {
  const { apiClientSecret: _, ...rest } = config;
  return {
    ...rest,
    hasSecret: !!config.apiClientSecret,
    ...(configuredVia && { configuredVia }),
  };
}

export const GET = withErrorTracking("/api/config", async () => {
  const [config, configuredVia] = await Promise.all([
    loadConfig(),
    getConfiguredVia(),
  ]);
  return NextResponse.json(toGetResponse(config, configuredVia));
});

export const POST = withErrorTracking("/api/config", async (request) => {
  try {
    const body = await request.json();
    const parsed = managerConfigUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const config = await saveConfig(parsed.data);
    const configuredVia = await getConfiguredVia();
    return NextResponse.json({
      success: true,
      message: "Configuration updated",
      ...toGetResponse(config, configuredVia),
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save configuration";
    return NextResponse.json({ error: message }, { status: 400 });
  }
});

export const DELETE = withErrorTracking("/api/config", async () => {
  await resetConfig();
  return NextResponse.json({ success: true, message: "Configuration reset" });
});
