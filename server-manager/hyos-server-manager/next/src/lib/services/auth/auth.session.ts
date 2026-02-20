import type { SessionOptions } from "iron-session";
import type { SessionData } from "./auth.types";

export const sessionOptions: SessionOptions = {
  password:
    process.env.SESSION_SECRET ??
    "this-is-a-dev-fallback-secret-that-is-at-least-32-chars-long",
  cookieName: "hyos_session",
  ttl: 60 * 60 * 24 * 7, // 7 days
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  },
};

// Type augmentation for iron-session
declare module "iron-session" {
  interface IronSessionData extends SessionData {}
}
