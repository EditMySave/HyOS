import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { sessionOptions } from "@/lib/services/auth/auth.session";
import type { SessionData } from "@/lib/services/auth/auth.types";

export async function POST() {
  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  session.destroy();
  return NextResponse.json({ success: true });
}
