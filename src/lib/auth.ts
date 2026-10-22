import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { SESSION_COOKIE, sessionCookieOptions, signSession, verifySession } from "./session";

/** The signed-in person, re-checked against the database. Null if signed out or deactivated. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return null;
  return user;
});

/** Signed-in person, or send them to sign in (clearing a stale session first). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/signout");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

export async function startSession(user: { id: string; name: string; role: string }) {
  const token = await signSession({
    sub: user.id,
    name: user.name,
    role: user.role === "ADMIN" ? "ADMIN" : "USER",
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions);
}

export async function endSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
