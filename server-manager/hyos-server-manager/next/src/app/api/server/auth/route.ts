import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { join } from "path";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import { loadConfig } from "@/lib/services/config/config.loader";

export interface AuthState {
  status: "authenticated" | "pending" | "failed" | "timeout" | "unknown";
  authenticated: boolean;
  profile: string | null;
  expiresAt: string | null;
  authUrl: string | null;
  authCode: string | null;
  updatedAt: string | null;
}

export const GET = withErrorTracking("/api/server/auth", async () => {
  const config = await loadConfig();
  const stateDir = config.stateDir || "/data/.state";
  const authPath = join(stateDir, "auth.json");

  try {
    const content = await readFile(authPath, "utf-8");
    const authState = JSON.parse(content);

    return NextResponse.json({
      status: authState.status || "unknown",
      authenticated: authState.authenticated || false,
      profile: authState.profile || null,
      expiresAt: authState.expires_at || null,
      authUrl: authState.auth_url || null,
      authCode: authState.auth_code || null,
      updatedAt: authState.updated_at || null,
    } satisfies AuthState);
  } catch {
    // State file doesn't exist yet
    return NextResponse.json({
      status: "unknown",
      authenticated: false,
      profile: null,
      expiresAt: null,
      authUrl: null,
      authCode: null,
      updatedAt: null,
    } satisfies AuthState);
  }
});
