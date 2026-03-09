import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { modProviderSchema } from "@/lib/services/mods/browser/types";
import {
  loadProviderSettings,
  resetProviderKey,
} from "@/lib/services/mods/providers.loader";

export const DELETE = withErrorTracking(
  "/api/mods/providers/settings/[provider]/key",
  async (_request, ctx) => {
    const { provider } = await ctx!.params;
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
  },
);
