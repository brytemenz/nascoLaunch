// Edge-safe session helpers (used by middleware and server code).
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "nl_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

export type SessionPayload = {
  sub: string;
  name: string;
  role: "USER" | "ADMIN";
};

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET is not set");
  return new TextEncoder().encode(value);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT({ name: payload.name, role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      sub: payload.sub as string,
      name: payload.name as string,
      role: payload.role as SessionPayload["role"],
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: MAX_AGE_SECONDS,
};

/* ── Employee (no-login) identity ──
   After someone orders, we remember who they are on that device so they can
   come back, see their order, and change it. */

export const GUEST_COOKIE = "nl_guest";
const GUEST_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export async function signGuest(userId: string) {
  return new SignJWT({ kind: "guest" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${GUEST_MAX_AGE}s`)
    .sign(secret());
}

export async function verifyGuest(token: string | undefined): Promise<string | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.kind === "guest" ? (payload.sub as string) : null;
  } catch {
    return null;
  }
}

export const guestCookieOptions = { ...sessionCookieOptions, maxAge: GUEST_MAX_AGE };
