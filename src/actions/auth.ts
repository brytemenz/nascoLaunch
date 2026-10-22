"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { endSession, forgetGuest, startSession } from "@/lib/auth";

export type FormState = { error?: string; success?: string } | undefined;

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

/** Admin sign-in. Employees don't sign in — they order with name and phone. */
export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const ok = user?.passwordHash && (await bcrypt.compare(parsed.data.password, user.passwordHash));
  if (!user || !ok) return { error: "Incorrect email or password" };
  if (!user.active) return { error: "This account has been deactivated." };
  if (user.role !== "ADMIN") return { error: "Only admins sign in. To order lunch, go back to the menu." };

  await startSession(user);
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/");
}

/** "Not you?" — forget the employee remembered on this device. */
export async function forgetMe() {
  await forgetGuest();
  redirect("/");
}
