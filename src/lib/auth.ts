import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import {
  GUEST_COOKIE,
  SESSION_COOKIE,
  guestCookieOptions,
  sessionCookieOptions,
  signGuest,
  signSession,
  verifyGuest,
  verifySession,
} from "./session";

/** The signed-in user, re-checked against the database. Null if signed out or deactivated. */
export const getCurrentUser = cache(async () => {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({ where: { id: session.sub } });
  if (!user || !user.active) return null;
  return user;
});

/** Signed-in admin, or null. */
export const getAdmin = cache(async () => {
  const user = await getCurrentUser();
  return user?.role === "ADMIN" ? user : null;
});

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");
  return user;
}

/** The employee remembered on this device (set after their first order), or null. */
export const getGuest = cache(async () => {
  const store = await cookies();
  const id = await verifyGuest(store.get(GUEST_COOKIE)?.value);
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id } });
  if (!user || !user.active) return null;
  return user;
});

export async function rememberGuest(userId: string) {
  const store = await cookies();
  store.set(GUEST_COOKIE, await signGuest(userId), guestCookieOptions);
}

export async function forgetGuest() {
  const store = await cookies();
  store.delete(GUEST_COOKIE);
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
