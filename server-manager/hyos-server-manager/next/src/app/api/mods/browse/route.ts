import { NextResponse } from "next/server";
import { z } from "zod";
import { runSearch } from "@/lib/services/mods/browser/aggregator.service";
import { searchParamsSchema } from "@/lib/services/mods/browser/types";
import { loadProviderConfig } from "@/lib/services/mods/providers.loader";

const browseBodySchema = z.object({
  params: searchParamsSchema,
});

export async function POST(request: Request) {
  try {
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
  } catch (error) {
    console.error("[mods/browse] Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Browse request failed",
      },
      { status: 500 },
    );
  }
}
