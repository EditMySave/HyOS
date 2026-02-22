import { NextResponse } from "next/server";
import { trackServerError } from "@/lib/services/analytics/umami.server";
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

export async function GET() {
  const [config, configuredVia] = await Promise.all([
    loadConfig(),
    getConfiguredVia(),
  ]);
  return NextResponse.json(toGetResponse(config, configuredVia));
}

export async function POST(request: Request) {
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
}

export async function DELETE() {
  try {
    await resetConfig();
    return NextResponse.json({ success: true, message: "Configuration reset" });
  } catch (err) {
    console.error("Config reset error:", err);
    await trackServerError(err, "/api/config/DELETE");
    return NextResponse.json(
      { error: "Failed to reset configuration" },
      { status: 500 },
    );
  }
}
