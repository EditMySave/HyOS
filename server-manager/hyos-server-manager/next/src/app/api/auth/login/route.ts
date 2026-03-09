import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { withErrorTracking } from "@/lib/services/analytics/route-handler";
import {
  findUserByUsername,
  verifyPassword,
} from "@/lib/services/auth/auth.loader";
import { sessionOptions } from "@/lib/services/auth/auth.session";
import type { SessionData } from "@/lib/services/auth/auth.types";
import { loginRequestSchema } from "@/lib/services/auth/auth.types";

export const POST = withErrorTracking("/api/auth/login", async (request) => {
  const body = await request.json();
  const parsed = loginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid credentials" },
      { status: 400 },
    );
  }

  const user = await findUserByUsername(parsed.data.username);
  if (!user) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const valid = await verifyPassword(user, parsed.data.password);
  if (!valid) {
    return NextResponse.json(
      { error: "Invalid username or password" },
      { status: 401 },
    );
  }

  const session = await getIronSession<SessionData>(
    await cookies(),
    sessionOptions,
  );
  session.userId = user.id;
  session.username = user.username;
  await session.save();

  return NextResponse.json({ success: true });
});
