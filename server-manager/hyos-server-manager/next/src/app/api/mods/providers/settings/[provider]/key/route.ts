import { modProviderSchema } from "@/lib/services/mods/browser/types";
import {
  loadProviderSettings,
  resetProviderKey,
} from "@/lib/services/mods/providers.loader";
import { NextResponse } from "next/server";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ provider: string }> },
) {
  try {
    const { provider } = await context.params;
    const parsed = modProviderSchema.safeParse(provider);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid provider", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    await resetProviderKey(parsed.data);
    const settings = await loadProviderSettings();
    return NextResponse.json(settings);
  } catch (err) {
    console.error(
      "[mods/providers/settings/[provider]/key] DELETE error:",
      err,
    );
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to reset API key",
      },
      { status: 500 },
    );
  }
}
