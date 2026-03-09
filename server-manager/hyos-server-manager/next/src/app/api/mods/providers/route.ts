import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { getProviders } from "@/lib/services/mods/browser/providers";

/**
 * List available mod providers and their metadata
 */
export const GET = withErrorTracking("/api/mods/providers", async () => {
  const providers = getProviders();

  const list = (["curseforge", "modtale", "nexusmods"] as const).map((id) => {
    const p = providers[id];
    return {
      id,
      name: p.name,
      authType: p.authType,
    };
  });

  return NextResponse.json({ providers: list });
});
