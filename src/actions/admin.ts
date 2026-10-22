"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { closeAndDispatch, dispatchRound } from "@/lib/rounds";
import { sendMessage } from "@/lib/messaging";
import { appUrl, buildMenuMessage, menuForRound } from "@/lib/share";
import { sendPinSetupLink } from "@/lib/pin";
import { normalisePhone, WEEKDAYS } from "@/lib/format";
import type { FormState } from "./auth";

function refreshAdmin() {
  revalidatePath("/", "layout");
}

/* ───────────── Lunch rounds ───────────── */

const roundSchema = z.object({
  title: z.string().trim().min(2, "Give the round a name"),
  closesAt: z.string().datetime({ message: "Pick a cut-off time" }),
});

export async function createRound(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = roundSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };

  const closesAt = new Date(parsed.data.closesAt);
  if (closesAt <= new Date()) return { error: "The cut-off time must be in the future" };

  const open = await db.lunchRound.count({ where: { status: "OPEN" } });
  if (open > 0) return { error: "Close the current round before opening a new one" };

  await db.lunchRound.create({ data: { title: parsed.data.title, date: closesAt, closesAt } });
  refreshAdmin();
  return { success: "Ordering is now open" };
}

export async function closeRound(roundId: string): Promise<FormState> {
  await requireAdmin();
  const results = await closeAndDispatch(roundId);
  refreshAdmin();
  if (!results) return { error: "This round was already closed" };
  return { success: summariseResults(results) };
}

export async function resendRound(roundId: string): Promise<FormState> {
  await requireAdmin();
  const round = await db.lunchRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== "CLOSED") return { error: "Only closed rounds can be re-sent" };
  const results = await dispatchRound(roundId);
  refreshAdmin();
  return { success: summariseResults(results) };
}

export async function extendRound(roundId: string, minutes: number) {
  await requireAdmin();
  const round = await db.lunchRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== "OPEN") return;
  const base = round.closesAt > new Date() ? round.closesAt : new Date();
  await db.lunchRound.update({
    where: { id: roundId },
    data: { closesAt: new Date(base.getTime() + minutes * 60_000) },
  });
  refreshAdmin();
}

export async function deleteRound(roundId: string) {
  await requireAdmin();
  await db.lunchRound.delete({ where: { id: roundId } });
  refreshAdmin();
}

function summariseResults(results: { channel: string; status: string; detail: string }[]) {
  if (results.length === 0) return "Round closed. No channels are enabled in Settings.";
  return results
    .map((r) => {
      const label = r.channel === "WHATSAPP" ? "WhatsApp" : "SMS";
      if (r.status === "SENT") return `${label} sent`;
      if (r.status === "SIMULATED") return `${label} simulated (Twilio not configured)`;
      return `${label} failed: ${r.detail}`;
    })
    .join(" · ");
}

/* ───────────── Menu ───────────── */

const menuSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Enter a name"),
  description: z.string().trim().max(200).optional(),
  category: z.string().trim().min(1, "Enter a category"),
  price: z.coerce.number().min(0, "Price can't be negative").default(0),
  emoji: z.string().trim().max(8).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || v.startsWith("/") || /^https?:\/\//.test(v), "Photo link must start with https:// or /")
    .optional(),
});

export async function saveMenuItem(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = menuSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { id, ...data } = parsed.data;
  const days = form.getAll("days").map(String).filter((d) => WEEKDAYS.some((w) => w.code === d));
  const clean = { ...data, days: days.join(","), description: data.description || null, emoji: data.emoji || null, imageUrl: data.imageUrl || null };

  if (id) await db.menuItem.update({ where: { id }, data: clean });
  else await db.menuItem.create({ data: clean });
  refreshAdmin();
  return { success: id ? "Item updated" : "Item added to the menu" };
}

export async function toggleMenuItem(id: string) {
  await requireAdmin();
  const item = await db.menuItem.findUnique({ where: { id } });
  if (!item) return;
  await db.menuItem.update({ where: { id }, data: { available: !item.available } });
  refreshAdmin();
}

export async function deleteMenuItem(id: string) {
  await requireAdmin();
  await db.menuItem.delete({ where: { id } });
  refreshAdmin();
}

/* ───────────── Users ───────────── */

const userSchema = z.object({
  name: z.string().trim().min(2, "Enter a name"),
  phone: z.string().trim().optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional().or(z.literal("")),
  department: z.string().trim().optional(),
  role: z.enum(["USER", "ADMIN"]),
  kind: z.enum(["STAFF", "INTERN", "NSS", "CONTRACTOR", "VISITOR", "OTHER"]).default("STAFF"),
  kindNote: z.string().trim().max(40).optional(),
  password: z.string().optional(),
});

export async function createUser(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = userSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const { name, role, password } = parsed.data;
  const email = parsed.data.email || null;
  const phone = parsed.data.phone ? normalisePhone(parsed.data.phone) : null;

  if (role === "ADMIN" && (!email || !password || password.length < 8)) {
    return { error: "Admins need an email and a password of at least 8 characters" };
  }
  if (role === "USER" && !phone) return { error: "Enter a phone number" };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters" };
  if (email && (await db.user.findUnique({ where: { email } }))) return { error: "That email is already registered" };
  if (phone && (await db.user.findUnique({ where: { phone } }))) return { error: "That phone number is already registered" };

  const user = await db.user.create({
    data: {
      name,
      role,
      email,
      phone,
      department: parsed.data.department || null,
      kind: role === "ADMIN" ? "STAFF" : parsed.data.kind,
      kindNote: parsed.data.kind === "OTHER" ? parsed.data.kindNote || null : null,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
    },
  });
  refreshAdmin();
  if (!phone) return { success: `${name} added` };

  // Text them a link to set their PIN.
  const { link, result } = await sendPinSetupLink(user.id);
  return describeInvite(name, link, result.status, result.detail);
}

/** (Re)sends the "set your PIN" SMS. Also how an admin resets someone's PIN. */
export async function resendPinLink(userId: string): Promise<FormState> {
  await requireAdmin();
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.phone) return { error: "This person has no phone number" };
  const { link, result } = await sendPinSetupLink(user.id);
  refreshAdmin();
  return describeInvite(user.name, link, result.status, result.detail);
}

function describeInvite(name: string, link: string, status: string, detail: string): FormState {
  if (status === "SENT") return { success: `PIN setup link texted to ${name}.`, link };
  if (status === "SIMULATED") return { success: `SMS isn't set up, so nothing was texted. Share this link with ${name}:`, link };
  return { error: `Couldn't text ${name} (${detail}). Share this link with them instead:`, link };
}

export async function setUserRole(userId: string, role: "USER" | "ADMIN"): Promise<FormState> {
  const admin = await requireAdmin();
  if (admin.id === userId) return { error: "You can't change your own role" };
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { error: "Person not found" };
  if (role === "ADMIN" && (!user.email || !user.passwordHash)) {
    return { error: `${user.name} needs an email and password before becoming an admin. Add them as a new admin instead.` };
  }
  await db.user.update({ where: { id: userId }, data: { role } });
  refreshAdmin();
  return { success: "Role updated" };
}

export async function toggleUserActive(userId: string) {
  const admin = await requireAdmin();
  if (admin.id === userId) return;
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return;
  await db.user.update({ where: { id: userId }, data: { active: !user.active } });
  refreshAdmin();
}

export async function resetUserPassword(userId: string, password: string): Promise<FormState> {
  await requireAdmin();
  if (password.length < 8) return { error: "Password must be at least 8 characters" };
  await db.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(password, 10) } });
  return { success: "Password updated" };
}

/* ───────────── Settings ───────────── */

const settingsSchema = z.object({
  companyName: z.string().trim().min(1),
  restaurantName: z.string().trim().min(1, "Enter the restaurant name"),
  restaurantPhone: z.string().trim(),
  restaurantWhatsapp: z.string().trim(),
  currency: z.string().trim().min(1).max(6),
});

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]!.message };
  const data = {
    ...parsed.data,
    sendWhatsapp: form.get("sendWhatsapp") === "on",
    sendSms: form.get("sendSms") === "on",
    showPrices: form.get("showPrices") === "on",
  };
  await db.settings.upsert({ where: { id: "app" }, update: data, create: { id: "app", ...data } });
  refreshAdmin();
  return { success: "Settings saved" };
}

export async function sendTestMessage(channel: "WHATSAPP" | "SMS"): Promise<FormState> {
  await requireAdmin();
  const settings = await db.settings.findUnique({ where: { id: "app" } });
  const to = channel === "WHATSAPP" ? settings?.restaurantWhatsapp || settings?.restaurantPhone : settings?.restaurantPhone;
  if (!to) return { error: "Add the restaurant's number first" };
  const result = await sendMessage(channel, to, `Test message from ${settings?.companyName ?? "NASCO"} Lunch. Orders will arrive here.`);
  if (result.status === "FAILED") return { error: result.detail };
  return { success: result.status === "SENT" ? "Test message sent" : result.detail };
}

/* ───────────── Share menu ───────────── */

/** Texts today's menu and the order link to every active person with a phone number. */
export async function smsMenuToStaff(roundId: string): Promise<FormState> {
  await requireAdmin();
  const round = await db.lunchRound.findUnique({ where: { id: roundId } });
  if (!round || round.status !== "OPEN") return { error: "Open a round before sharing the menu" };

  const [settings, { dayLabel, items }, url, people] = await Promise.all([
    db.settings.findUnique({ where: { id: "app" } }),
    menuForRound(round),
    appUrl(),
    db.user.findMany({ where: { active: true, phone: { not: null } }, select: { phone: true } }),
  ]);
  if (items.length === 0) return { error: `No dishes are set for ${dayLabel}` };
  if (people.length === 0) return { error: "No staff phone numbers yet. They're saved when people order, or add them under People." };

  const body = buildMenuMessage({
    companyName: settings?.companyName ?? "NASCO",
    dayLabel,
    dishes: items.map((i) => i.name),
    closesAt: round.closesAt,
    url,
    plain: true,
  });

  let sent = 0;
  let failed = 0;
  let simulated = 0;
  // Send in parallel batches of 10 so a big team doesn't take ages.
  for (let i = 0; i < people.length; i += 10) {
    const results = await Promise.all(people.slice(i, i + 10).map((p) => sendMessage("SMS", p.phone!, body)));
    for (const r of results) {
      if (r.status === "SENT") sent++;
      else if (r.status === "SIMULATED") simulated++;
      else failed++;
    }
  }
  if (simulated) return { success: `SMS isn't set up — ${simulated} message${simulated === 1 ? "" : "s"} simulated` };
  if (failed && !sent) return { error: `Couldn't send the menu (${failed} failed). Check your SMS balance and sender ID.` };
  return { success: `Menu sent to ${sent} ${sent === 1 ? "person" : "people"}${failed ? ` · ${failed} failed` : ""}` };
}
