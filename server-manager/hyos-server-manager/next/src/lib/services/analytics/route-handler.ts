import { NextResponse } from "next/server";
import { classifyError, trackServerError } from "./umami.server";

type Handler = (
  req: Request,
  ctx?: { params: Promise<Record<string, string>> },
) => Promise<NextResponse>;

export function withErrorTracking(route: string, handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Internal server error";

      console.error(`[${route}] Error:`, error);

      await trackServerError(error, {
        method: req.method,
        url: new URL(req.url).pathname,
        route,
        category: classifyError(error),
        statusCode: 500,
      });

      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
