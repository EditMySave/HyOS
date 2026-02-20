import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { needsSetup } from "@/lib/services/auth/auth.loader";
import { sessionOptions } from "@/lib/services/auth/auth.session";
import type { SessionData } from "@/lib/services/auth/auth.types";

export async function GET() {
  const setupRequired = await needsSetup();
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );

  return NextResponse.json({
    authenticated: !!session.userId,
    needsSetup: setupRequired,
    ...(session.username && { username: session.username }),
  });
}
