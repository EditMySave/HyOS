import { NextResponse } from "next/server";
import { loadConfig } from "@/lib/services/config/config.loader";

export async function GET() {
  const config = await loadConfig();
  const baseUrl = `http://${config.serverHost}:${config.serverPort}`;

  // Try to reach the health endpoint
  let healthResult: { ok: boolean; status?: number; error?: string } = {
    ok: false,
  };
  try {
    const response = await fetch(`${baseUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    healthResult = { ok: response.ok, status: response.status };
  } catch (error) {
    healthResult = {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Return diagnostic info
  return NextResponse.json({
    config: {
      serverHost: config.serverHost,
      serverPort: config.serverPort,
      containerName: config.containerName,
      apiClientId: config.apiClientId,
      hasSecret: !!config.apiClientSecret,
      stateDir: config.stateDir,
      setupComplete: config.setupComplete,
    },
    computed: {
      baseUrl,
      healthEndpoint: `${baseUrl}/health`,
    },
    healthCheck: healthResult,
    env: {
      HYTALE_SERVER_HOST: process.env.HYTALE_SERVER_HOST || "(not set)",
      HYTALE_SERVER_PORT: process.env.HYTALE_SERVER_PORT || "(not set)",
      HYTALE_STATE_DIR: process.env.HYTALE_STATE_DIR || "(not set)",
      REST_API_CLIENT_ID: process.env.REST_API_CLIENT_ID || "(not set)",
      REST_API_CLIENT_SECRET: process.env.REST_API_CLIENT_SECRET
        ? "(set)"
        : "(not set)",
      API_CLIENT_SECRET: process.env.API_CLIENT_SECRET ? "(set)" : "(not set)",
      NODE_ENV: process.env.NODE_ENV || "(not set)",
    },
  });
}
