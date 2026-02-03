import { NextResponse } from "next/server";
import {
  loadProviderSettings,
  saveProviderSettings,
} from "@/lib/services/mods/providers.loader";
import { saveProviderSettingsRequestSchema } from "@/lib/services/mods/providers.types";

export async function GET() {
  try {
    const settings = await loadProviderSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error("[mods/providers/settings] GET error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Failed to load provider settings",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to save provider settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
