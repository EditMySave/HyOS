import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createUser, needsSetup } from "@/lib/services/auth/auth.loader";
import { sessionOptions } from "@/lib/services/auth/auth.session";
import type { SessionData } from "@/lib/services/auth/auth.types";
import { setupRequestSchema } from "@/lib/services/auth/auth.types";

export async function POST(request: Request) {
  try {
    const setupRequired = await needsSetup();
    if (!setupRequired) {
      return NextResponse.json(
        { error: "Setup has already been completed" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const parsed = setupRequestSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Invalid input";
      return NextResponse.json({ error: message }, { status: 400 });
    }

    const user = await createUser(parsed.data.username, parsed.data.password);

    // Auto-login after setup
    const session = await getIronSession<SessionData>(
      await cookies(),
      sessionOptions,
    );
    session.userId = user.id;
    session.username = user.username;
    await session.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
