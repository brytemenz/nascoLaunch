"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, startSession } from "@/lib/auth";
import { normalisePhone } from "@/lib/format";
import { findBySetupToken, isValidPin, LOCK_MINUTES, MAX_PIN_ATTEMPTS, PIN_LENGTH, sendPinSetupLink } from "@/lib/pin";

export type FormState = { error?: string; success?: string; link?: string } | undefined;

/* ───────────── Staff: phone + PIN ───────────── */

export async function loginWithPin(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  const pin = String(form.get("pin") ?? "");
  if (phone.replace(/\D/g, "").length < 10) return { error: "Enter your phone number" };
  if (!isValidPin(pin)) return { error: `Enter your ${PIN_LENGTH}-digit PIN` };

  const user = await db.user.findUnique({ where: { phone } });
  const wrong = { error: "Wrong phone number or PIN" };
  if (!user || !user.active) return wrong;
  if (!user.pinHash) return { error: "You haven't set a PIN yet. Use the link we texted you, or tap “Forgot PIN”." };

  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const mins = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60_000);
    return { error: `Too many wrong PINs. Try again in ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  if (!(await bcrypt.compare(pin, user.pinHash))) {
    const attempts = user.failedPinAttempts + 1;
    const lock = attempts >= MAX_PIN_ATTEMPTS;
    await db.user.update({
      where: { id: user.id },
      data: lock
        ? { failedPinAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
        : { failedPinAttempts: attempts },
    });
    if (lock) return { error: `Too many wrong PINs. Your account is locked for ${LOCK_MINUTES} minutes.` };
    const left = MAX_PIN_ATTEMPTS - attempts;
    return { error: `Wrong phone number or PIN. ${left} ${left === 1 ? "try" : "tries"} left.` };
  }

  await db.user.update({ where: { id: user.id }, data: { failedPinAttempts: 0, lockedUntil: null } });
  await startSession(user);
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

/** Texts a new PIN link. Always answers the same way so it can't be used to find out who's registered. */
export async function forgotPin(_: FormState, form: FormData): Promise<FormState> {
  const phone = normalisePhone(String(form.get("phone") ?? ""));
  if (phone.replace(/\D/g, "").length < 10) return { error: "Enter your phone number" };

  const user = await db.user.findUnique({ where: { phone } });
  const recentlySent = user?.setupSentAt && Date.now() - user.setupSentAt.getTime() < 2 * 60_000;
  if (user && user.active && !recentlySent) await sendPinSetupLink(user.id);

  return { success: "If that number is registered, we've texted you a link to set a new PIN." };
}

const setPinSchema = z.object({
  token: z.string().min(10),
  pin: z.string(),
  confirm: z.string(),
});

export async function setPin(_: FormState, form: FormData): Promise<FormState> {
  const parsed = setPinSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Something went wrong. Open the link from your SMS again." };
  const { token, pin, confirm } = parsed.data;
  if (!isValidPin(pin)) return { error: `Your PIN must be ${PIN_LENGTH} digits` };
  if (pin !== confirm) return { error: "The two PINs don't match" };
  if (/^(\d)\1+$/.test(pin) || "0123456789".includes(pin) || "9876543210".includes(pin)) {
    return { error: "Pick a PIN that's harder to guess than repeated or sequential digits" };
  }

  const user = await findBySetupToken(token);
  if (!user) return { error: "This link has expired or was already used. Tap “Forgot PIN” on the sign-in page to get a new one." };

  await db.user.update({
    where: { id: user.id },
    data: {
      pinHash: await bcrypt.hash(pin, 10),
      setupToken: null,
      setupTokenExpires: null,
      failedPinAttempts: 0,
      lockedUntil: null,
    },
  });
  await startSession(user);
  redirect(user.role === "ADMIN" ? "/admin" : "/");
}

/* ───────────── Admins: email + password ───────────── */

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return { error: "Incorrect email or password" };
  if (!user.active) return { error: "This account has been deactivated." };
  if (user.role !== "ADMIN") return { error: "Email sign-in is for admins. Sign in with your phone number and PIN." };

  await startSession(user);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
