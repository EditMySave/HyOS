import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { runSearch } from "@/lib/services/mods/browser/aggregator.service";
import { searchParamsSchema } from "@/lib/services/mods/browser/types";
import { loadProviderConfig } from "@/lib/services/mods/providers.loader";

const browseBodySchema = z.object({
  params: searchParamsSchema,
});

export const POST = withErrorTracking("/api/mods/browse", async (request) => {
  const body = await request.json();
  const parsed = browseBodySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { params } = parsed.data;
  const providerConfig = await loadProviderConfig();
  const results = await runSearch(params, providerConfig);

  return NextResponse.json(results);
});
