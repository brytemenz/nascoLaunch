import "server-only";
import { db } from "./db";
import { dayKey, kindLabel } from "./format";

export type Period = { from: string; to: string; label: string }; // YYYY-MM-DD, inclusive

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Turns ?range=…&from=…&to=… into a date range. Ghana is UTC+0 all year, so UTC days match local days. */
export function resolvePeriod(params: { range?: string; from?: string; to?: string }): Period {
  const today = new Date();
  const t = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const valid = (s?: string) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);

  if (valid(params.from) && valid(params.to)) {
    const [from, to] = params.from! <= params.to! ? [params.from!, params.to!] : [params.to!, params.from!];
    return { from, to, label: "Custom" };
  }
  switch (params.range) {
    case "week": {
      const monday = new Date(t);
      monday.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7));
      return { from: iso(monday), to: iso(t), label: "This week" };
    }
    case "last-month": {
      const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() - 1, 1));
      const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 0));
      return { from: iso(first), to: iso(last), label: "Last month" };
    }
    case "year":
      return { from: `${t.getUTCFullYear()}-01-01`, to: iso(t), label: "This year" };
    default: {
      const first = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
      return { from: iso(first), to: iso(t), label: "This month" };
    }
  }
}

/** Every meal in the period, one row each — the basis for the report and the CSV. */
export async function mealsInPeriod(period: Period) {
  const orders = await db.order.findMany({
    where: {
      round: {
        date: {
          gte: new Date(`${period.from}T00:00:00.000Z`),
          lte: new Date(`${period.to}T23:59:59.999Z`),
        },
      },
    },
    include: { items: true, user: true, placedBy: true, round: true },
    orderBy: [{ round: { date: "asc" } }, { createdAt: "asc" }],
  });

  return orders.flatMap((o) =>
    o.items.map((item) => ({
      date: dayKey(o.round.date),
      round: o.round.title,
      roundOpen: o.round.status === "OPEN",
      personId: o.userId,
      name: o.user.name,
      phone: o.user.phone,
      department: o.user.department,
      kind: o.user.kind,
      type: kindLabel(o.user.kind, o.user.kindNote) ?? "Staff",
      dish: item.name,
      quantity: item.quantity,
      cost: item.price * item.quantity,
      orderedBy: o.placedBy?.name ?? null,
      notes: o.notes,
    })),
  );
}

type Meal = Awaited<ReturnType<typeof mealsInPeriod>>[number];

function groupBy(meals: Meal[], key: (m: Meal) => string) {
  const map = new Map<string, { key: string; meals: number; cost: number }>();
  for (const m of meals) {
    const k = key(m);
    const row = map.get(k) ?? { key: k, meals: 0, cost: 0 };
    row.meals += m.quantity;
    row.cost += m.cost;
    map.set(k, row);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost || b.meals - a.meals);
}

/** Everything the Reports page shows. */
export async function buildReport(period: Period) {
  const meals = await mealsInPeriod(period);

  const total = meals.reduce((s, m) => s + m.cost, 0);
  const count = meals.reduce((s, m) => s + m.quantity, 0);
  const days = new Set(meals.map((m) => m.date));

  // Spend per day, including days with nothing ordered (weekdays only, to keep the chart readable).
  const perDay: { date: string; meals: number; cost: number }[] = [];
  const byDate = new Map(groupBy(meals, (m) => m.date).map((r) => [r.key, r]));
  for (let d = new Date(`${period.from}T00:00:00Z`); d <= new Date(`${period.to}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 1)) {
    const key = iso(d);
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const row = byDate.get(key);
    if (row || !weekend) perDay.push({ date: key, meals: row?.meals ?? 0, cost: row?.cost ?? 0 });
  }

  // People: keep their details alongside the totals.
  const people = new Map<string, { name: string; type: string; department: string | null; meals: number; cost: number; days: Set<string> }>();
  for (const m of meals) {
    const p = people.get(m.personId) ?? { name: m.name, type: m.type, department: m.department, meals: 0, cost: 0, days: new Set<string>() };
    p.meals += m.quantity;
    p.cost += m.cost;
    p.days.add(m.date);
    people.set(m.personId, p);
  }

  return {
    period,
    total,
    count,
    people: people.size,
    days: days.size,
    avgPerDay: days.size ? total / days.size : 0,
    perDay,
    byPerson: [...people.values()]
      .map((p) => ({ ...p, days: p.days.size }))
      .sort((a, b) => b.cost - a.cost || a.name.localeCompare(b.name)),
    byDepartment: groupBy(meals, (m) => m.department || "No department"),
    byDish: groupBy(meals, (m) => m.dish),
    byType: groupBy(meals, (m) => m.type),
    guestMeals: meals.filter((m) => m.kind !== "STAFF").reduce((s, m) => s + m.quantity, 0),
  };
}
