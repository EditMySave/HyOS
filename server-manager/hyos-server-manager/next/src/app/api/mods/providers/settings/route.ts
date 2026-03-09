import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import {
  loadProviderSettings,
  saveProviderSettings,
} from "@/lib/services/mods/providers.loader";
import { saveProviderSettingsRequestSchema } from "@/lib/services/mods/providers.types";

export const GET = withErrorTracking(
  "/api/mods/providers/settings",
  async () => {
    const settings = await loadProviderSettings();
    return NextResponse.json(settings);
  },
);

export const PUT = withErrorTracking(
  "/api/mods/providers/settings",
  async (request) => {
    const body = await request.json();
    const parsed = saveProviderSettingsRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { provider, enabled, apiKey } = parsed.data;
    await saveProviderSettings(provider, {
      enabled,
      ...(apiKey !== undefined && { apiKey: apiKey ?? null }),
    });
    const settings = await loadProviderSettings();
    return NextResponse.json(settings);
  },
);
