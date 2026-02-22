import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { trackServerError } from "@/lib/services/analytics/umami.server";
import {
  findUserByUsername,
  verifyPassword,
} from "@/lib/services/auth/auth.loader";
import { sessionOptions } from "@/lib/services/auth/auth.session";
import type { SessionData } from "@/lib/services/auth/auth.types";
import { loginRequestSchema } from "@/lib/services/auth/auth.types";

export async function POST(request: Request) {
  try {
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
  } catch (err) {
    console.error("Login error:", err);
    await trackServerError(err, "/api/auth/login");
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
