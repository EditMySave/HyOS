export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startHeartbeat } = await import(
      "@/lib/services/analytics/heartbeat"
    );
    startHeartbeat();
  }
}

export async function onRequestError(
  error: { digest: string } & Error,
  request: { path: string; method: string; headers: Record<string, string> },
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
    renderSource: string;
  },
) {
  const { trackServerError } = await import(
    "@/lib/services/analytics/umami.server"
  );
  await trackServerError(error, {
    method: request.method,
    url: request.path,
    route: context.routePath,
    category: "render",
    statusCode: 500,
  });
}
