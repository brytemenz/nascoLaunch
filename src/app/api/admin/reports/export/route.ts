import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/db";
import { mealsInPeriod, resolvePeriod } from "@/lib/reports";

export const dynamic = "force-dynamic";

/** CSV of every meal in the period (opens in Excel / Google Sheets). Admins only. */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = req.nextUrl.searchParams;
  const period = resolvePeriod({ range: sp.get("range") ?? undefined, from: sp.get("from") ?? undefined, to: sp.get("to") ?? undefined });
  const [meals, settings] = await Promise.all([mealsInPeriod(period), getSettings()]);

  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    // Quote everything; neutralise spreadsheet formulas in user-entered text.
    const risky = /^[=+\-@]/.test(s) && !/^\+?\d+$/.test(s); // phone numbers like +233… are safe
    return `"${(risky ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const header = ["Date", "Name", "Type", "Department", "Phone", "Meal", "Quantity", `Cost (${settings.currency})`, "Ordered by", "Note"];
  const rows = meals.map((m) => [m.date, m.name, m.type, m.department, m.phone, m.dish, m.quantity, m.cost.toFixed(2), m.orderedBy, m.notes]);
  const total = meals.reduce((s, m) => s + m.cost, 0);
  const csv = [header, ...rows, [], ["Total", "", "", "", "", "", meals.length, total.toFixed(2)]]
    .map((r) => r.map(cell).join(","))
    .join("\r\n");

  return new NextResponse("﻿" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lunch-expenses-${period.from}-to-${period.to}.csv"`,
    },
  });
}
