import "server-only";
import { db, getSettings } from "./db";
import { formatDate, formatTime, money } from "./format";
import { sendMessage, type Channel } from "./messaging";

const roundInclude = {
  orders: {
    include: { user: true, items: true, placedBy: true },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export async function getRoundWithOrders(id: string) {
  return db.lunchRound.findUnique({ where: { id }, include: roundInclude });
}

type RoundWithOrders = NonNullable<Awaited<ReturnType<typeof getRoundWithOrders>>>;

/** Totals per menu item across every order in the round. */
export function summarise(round: RoundWithOrders) {
  const byItem = new Map<string, { name: string; quantity: number; subtotal: number }>();
  let total = 0;
  let meals = 0;
  for (const order of round.orders) {
    for (const item of order.items) {
      const row = byItem.get(item.name) ?? { name: item.name, quantity: 0, subtotal: 0 };
      row.quantity += item.quantity;
      row.subtotal += item.quantity * item.price;
      byItem.set(item.name, row);
      total += item.quantity * item.price;
      meals += item.quantity;
    }
  }
  const items = [...byItem.values()].sort((a, b) => b.quantity - a.quantity);
  return { items, total, meals, people: round.orders.length };
}

/** The text sent to the restaurant. SMS gets a shorter version. */
export function buildRestaurantMessage(
  round: RoundWithOrders,
  settings: { companyName: string; currency: string; showPrices: boolean },
  channel: Channel,
) {
  const s = summarise(round);
  const lines: string[] = [];
  const bold = (t: string) => (channel === "WHATSAPP" ? `*${t}*` : t);

  lines.push(bold(`${settings.companyName} Lunch Order`));
  lines.push(`${formatDate(round.date, { year: "numeric" })} · ${round.title}`);
  lines.push("");

  if (s.people === 0) {
    lines.push("No orders were placed for this round.");
    return lines.join("\n");
  }

  lines.push(bold(`Summary — ${s.meals} item${s.meals === 1 ? "" : "s"}, ${s.people} ${s.people === 1 ? "person" : "people"}`));
  for (const item of s.items) lines.push(`• ${item.quantity} × ${item.name}`);
  lines.push("");

  lines.push(bold("By person"));
  round.orders.forEach((order, i) => {
    const what = order.items.map((it) => `${it.quantity}× ${it.name}`).join(", ");
    const note = order.notes ? ` (${order.notes})` : "";
    lines.push(`${i + 1}. ${order.user.name} — ${what}${note}`);
  });
  lines.push("");
  if (settings.showPrices) lines.push(bold(`Total: ${money(s.total, settings.currency)}`));
  lines.push("Thank you!");

  // Plain characters keep SMS in the cheaper GSM format (symbols like • × — force Unicode).
  const plain = (t: string) => (channel === "SMS" ? t.replace(/[•]/g, "-").replace(/×/g, "x").replace(/[—–·]/g, "-").replace(/₵/g, "C") : t);
  const text = plain(lines.join("\n"));
  if (channel === "SMS" && text.length > 1500) {
    // Too long for one SMS batch — drop the per-person list.
    const byPersonStart = lines.indexOf("By person");
    const short = [
      ...lines.slice(0, byPersonStart),
      ...(settings.showPrices ? [`Total: ${money(s.total, settings.currency)}`] : []),
      "Full list sent on WhatsApp.",
    ];
    return plain(short.join("\n"));
  }
  return text;
}

/** Sends the round's order to the restaurant on every enabled channel and logs the result. */
export async function dispatchRound(roundId: string) {
  const [round, settings] = await Promise.all([getRoundWithOrders(roundId), getSettings()]);
  if (!round) throw new Error("Round not found");

  const jobs: { channel: Channel; to: string }[] = [];
  if (settings.sendWhatsapp) jobs.push({ channel: "WHATSAPP", to: settings.restaurantWhatsapp || settings.restaurantPhone });
  if (settings.sendSms) jobs.push({ channel: "SMS", to: settings.restaurantPhone });

  const results = await Promise.all(
    jobs.map(async (job) => {
      const body = buildRestaurantMessage(round, settings, job.channel);
      const result = await sendMessage(job.channel, job.to, body);
      await db.dispatchLog.create({
        data: { roundId, channel: job.channel, recipient: job.to || "—", status: result.status, detail: result.detail },
      });
      return { ...job, ...result };
    }),
  );
  return results;
}

/**
 * Closes a round and sends it to the restaurant.
 * Uses a conditional update so a round is only ever closed (and sent) once,
 * even if an admin click and the auto-close happen at the same moment.
 */
export async function closeAndDispatch(roundId: string) {
  const claimed = await db.lunchRound.updateMany({
    where: { id: roundId, status: "OPEN" },
    data: { status: "CLOSED", closedAt: new Date() },
  });
  if (claimed.count === 0) return null;
  return dispatchRound(roundId);
}

/** Closes every open round whose cut-off time has passed. Safe to call often. */
export async function autoCloseDueRounds() {
  const due = await db.lunchRound.findMany({
    where: { status: "OPEN", closesAt: { lte: new Date() } },
    select: { id: true },
  });
  for (const r of due) {
    try {
      await closeAndDispatch(r.id);
    } catch (err) {
      console.error("Auto-close failed for round", r.id, err);
    }
  }
  return due.length;
}

/** The round employees should see: the open one, otherwise the most recent. */
export async function getActiveRound() {
  await autoCloseDueRounds();
  const open = await db.lunchRound.findFirst({ where: { status: "OPEN" }, orderBy: { closesAt: "asc" } });
  if (open) return open;
  return db.lunchRound.findFirst({ orderBy: { date: "desc" } });
}

export function describeCutoff(closesAt: Date) {
  return `${formatDate(closesAt)} at ${formatTime(closesAt)}`;
}
