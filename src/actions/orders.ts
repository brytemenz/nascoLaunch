"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getGuest, rememberGuest } from "@/lib/auth";
import { dayKey, normalisePhone } from "@/lib/format";
import { autoCloseDueRounds } from "@/lib/rounds";

const person = z.object({
  name: z.string().trim().min(2, "Enter a name").max(60),
  phone: z.string().trim().min(1, "Enter a phone number"),
});

const orderSchema = z.object({
  roundId: z.string().min(1),
  me: person, // the person using this device
  forOther: person.nullable().optional(), // set when ordering on someone else's behalf
  notes: z.string().trim().max(200).optional(),
  items: z
    .array(z.object({ menuItemId: z.string().min(1), quantity: z.number().int().min(1).max(20) }))
    .min(1, "Add at least one item"),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderResult = { ok: true; message: string } | { ok: false; message: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/admin", "layout");
}

function cleanPhone(raw: string) {
  const phone = normalisePhone(raw);
  return phone.replace(/\D/g, "").length >= 10 ? phone : null;
}

async function findOrCreatePerson(name: string, phone: string) {
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) return existing;
  try {
    return await db.user.create({ data: { name, phone } });
  } catch {
    // Someone created the same number at the same moment.
    return db.user.findUniqueOrThrow({ where: { phone } });
  }
}

/** Does this person already have an order on the same day, in a different round? */
async function orderedElsewhereToday(userId: string, round: { id: string; date: Date }) {
  const recent = await db.order.findMany({
    where: {
      userId,
      roundId: { not: round.id },
      round: { date: { gte: new Date(round.date.getTime() - 36 * 3600_000), lte: new Date(round.date.getTime() + 36 * 3600_000) } },
    },
    include: { round: true },
  });
  return recent.some((o) => dayKey(o.round.date) === dayKey(round.date));
}

export async function saveOrder(input: OrderInput): Promise<OrderResult> {
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const { roundId, notes, forOther } = parsed.data;

  const myPhone = cleanPhone(parsed.data.me.phone);
  if (!myPhone) return { ok: false, message: "Enter a valid phone number for yourself" };
  const theirPhone = forOther ? cleanPhone(forOther.phone) : null;
  if (forOther && !theirPhone) return { ok: false, message: "Enter a valid phone number for the person you're ordering for" };

  await autoCloseDueRounds();
  const round = await db.lunchRound.findUnique({ where: { id: roundId } });
  if (!round) return { ok: false, message: "This lunch round no longer exists." };
  if (round.status !== "OPEN") return { ok: false, message: "Ordering for this round has closed." };

  // Prices come from the database, never from the browser.
  const menu = await db.menuItem.findMany({
    where: { id: { in: parsed.data.items.map((i) => i.menuItemId) }, available: true },
  });
  const lines = parsed.data.items
    .map((i) => {
      const item = menu.find((m) => m.id === i.menuItemId);
      return item ? { menuItemId: item.id, name: item.name, price: item.price, quantity: i.quantity } : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  if (lines.length !== parsed.data.items.length) {
    return { ok: false, message: "Some items are no longer available. Please refresh the menu." };
  }
  const total = lines.reduce((sum, l) => sum + l.price * l.quantity, 0);

  // Who is using this device, and who is the order for?
  const remembered = await getGuest();
  const placer = await findOrCreatePerson(parsed.data.me.name, myPhone);
  if (!placer.active) return { ok: false, message: "This number has been blocked from ordering. Contact an admin." };
  const isMe = remembered?.id === placer.id;

  const target = theirPhone && theirPhone !== myPhone ? await findOrCreatePerson(forOther!.name, theirPhone) : placer;
  const forSelf = target.id === placer.id;
  if (!target.active) return { ok: false, message: `${target.name} has been blocked from ordering.` };

  const existing = await db.order.findUnique({ where: { userId_roundId: { userId: target.id, roundId } } });

  if (existing) {
    // Only you, on the device you ordered from, can change your own order.
    if (!forSelf) {
      return { ok: false, message: `${target.name} has already ordered for today. Cancel that order first if it needs to change.` };
    }
    if (!isMe) {
      return { ok: false, message: "This number has already ordered for today. Change it from the phone you ordered on, or ask an admin." };
    }
  }

  // One order per person per day, even across rounds.
  if (await orderedElsewhereToday(target.id, round)) {
    return { ok: false, message: `${forSelf ? "You have" : `${target.name} has`} already ordered today.` };
  }

  // Keep the remembered person's name up to date.
  if (isMe && placer.name !== parsed.data.me.name) {
    await db.user.update({ where: { id: placer.id }, data: { name: parsed.data.me.name } });
  }

  await db.$transaction(async (tx) => {
    const order = await tx.order.upsert({
      where: { userId_roundId: { userId: target.id, roundId } },
      update: { notes: notes || null, total },
      create: { userId: target.id, roundId, notes: notes || null, total, placedById: forSelf ? null : placer.id },
    });
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.createMany({ data: lines.map((l) => ({ ...l, orderId: order.id })) });
  });

  await rememberGuest(placer.id);
  refresh();
  if (!forSelf) return { ok: true, message: `Order placed for ${target.name}.` };
  return { ok: true, message: existing ? "Your order has been updated." : "Order placed. Enjoy your lunch!" };
}

/** Cancel your own order, or one you placed for someone else. */
export async function cancelOrder(orderId: string): Promise<OrderResult> {
  const me = await getGuest();
  if (!me) return { ok: false, message: "We couldn't find your order on this device." };

  await autoCloseDueRounds();
  const order = await db.order.findUnique({ where: { id: orderId }, include: { round: true, user: true } });
  if (!order) return { ok: false, message: "That order no longer exists." };
  if (order.userId !== me.id && order.placedById !== me.id) {
    return { ok: false, message: "You can only cancel orders you placed." };
  }
  if (order.round.status !== "OPEN") return { ok: false, message: "Ordering for this round has closed." };

  await db.order.delete({ where: { id: order.id } });
  refresh();
  return { ok: true, message: order.userId === me.id ? "Your order has been cancelled." : `Order for ${order.user.name} cancelled.` };
}
