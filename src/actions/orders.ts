"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { dayKey, displayName } from "@/lib/format";
import { autoCloseDueRounds } from "@/lib/rounds";

// One order per person per day, and each order is exactly one meal.
const orderSchema = z.object({
  roundId: z.string().min(1),
  menuItemId: z.string().min(1, "Pick a meal"),
  forUserId: z.string().nullable().optional(), // ordering on a colleague's behalf
  // …or for someone not on the staff list (visitor, intern, etc.)
  forGuest: z
    .object({
      name: z.string().trim().min(2, "Enter their name").max(60),
      kind: z.enum(["VISITOR", "INTERN", "NSS", "CONTRACTOR", "OTHER"]),
      note: z.string().trim().max(40).optional(),
    })
    .nullable()
    .optional(),
  notes: z.string().trim().max(200).optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderResult = { ok: true; message: string } | { ok: false; message: string };

function refresh() {
  revalidatePath("/");
  revalidatePath("/orders");
  revalidatePath("/admin", "layout");
}

/** Does this person already have an order on the same day, in a different round? */
async function orderedElsewhereToday(userId: string, round: { id: string; date: Date }) {
  const window = 36 * 3600_000;
  const recent = await db.order.findMany({
    where: {
      userId,
      roundId: { not: round.id },
      round: { date: { gte: new Date(round.date.getTime() - window), lte: new Date(round.date.getTime() + window) } },
    },
    include: { round: true },
  });
  return recent.some((o) => dayKey(o.round.date) === dayKey(round.date));
}

/** People not on the staff list get a record (no phone, can't sign in) so their orders show up properly. */
async function findOrCreateGuest(name: string, kind: string, note: string | null) {
  const existing = await db.user.findFirst({
    where: { phone: null, email: null, kind, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing;
  return db.user.create({ data: { name, kind, kindNote: note } });
}

export async function saveOrder(input: OrderInput): Promise<OrderResult> {
  const me = await requireUser();
  const parsed = orderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]!.message };
  const { roundId, menuItemId, notes } = parsed.data;

  await autoCloseDueRounds();
  const round = await db.lunchRound.findUnique({ where: { id: roundId } });
  if (!round) return { ok: false, message: "This lunch round no longer exists." };
  if (round.status !== "OPEN") return { ok: false, message: "Ordering for this round has closed." };

  // Prices come from the database, never from the browser.
  const dish = await db.menuItem.findFirst({ where: { id: menuItemId, available: true } });
  if (!dish) return { ok: false, message: "That meal is no longer available. Please refresh the menu." };

  const forUserId = parsed.data.forUserId && parsed.data.forUserId !== me.id ? parsed.data.forUserId : null;
  const guest = parsed.data.forGuest;
  if (guest?.kind === "OTHER" && !guest.note) return { ok: false, message: "Say who they are, e.g. Driver" };
  const target = guest
    ? await findOrCreateGuest(guest.name, guest.kind, guest.kind === "OTHER" ? guest.note! : null)
    : forUserId
      ? await db.user.findUnique({ where: { id: forUserId } })
      : me;
  if (!target || !target.active) return { ok: false, message: "That person can't be ordered for." };
  const forSelf = target.id === me.id;

  const existing = await db.order.findUnique({ where: { userId_roundId: { userId: target.id, roundId } } });
  if (existing && !forSelf) {
    return { ok: false, message: `${target.name} has already ordered today.` };
  }
  if (await orderedElsewhereToday(target.id, round)) {
    return { ok: false, message: `${forSelf ? "You have" : `${target.name} has`} already ordered today.` };
  }

  await db.$transaction(async (tx) => {
    const order = await tx.order.upsert({
      where: { userId_roundId: { userId: target.id, roundId } },
      update: { notes: notes || null, total: dish.price },
      create: { userId: target.id, roundId, notes: notes || null, total: dish.price, placedById: forSelf ? null : me.id },
    });
    await tx.orderItem.deleteMany({ where: { orderId: order.id } });
    await tx.orderItem.create({ data: { orderId: order.id, menuItemId: dish.id, name: dish.name, price: dish.price, quantity: 1 } });
  });

  refresh();
  if (!forSelf) return { ok: true, message: `Ordered ${dish.name} for ${displayName(target)}.` };
  return { ok: true, message: existing ? "Your order has been changed." : "Order placed. Enjoy your lunch!" };
}

/** Cancel your own order, or one you placed for someone else. */
export async function cancelOrder(orderId: string): Promise<OrderResult> {
  const me = await requireUser();
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
