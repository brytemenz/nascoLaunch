import "server-only";
import { headers } from "next/headers";
import { db } from "./db";
import { formatTime, servedOn, weekdayOf, WEEKDAYS } from "./format";

/** Public address of the app, e.g. https://lunch.nasco.com. Set APP_URL in production. */
export async function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Dishes available for a round's weekday. */
export async function menuForRound(round: { date: Date }) {
  const day = weekdayOf(round.date);
  const items = await db.menuItem.findMany({ where: { available: true }, orderBy: { name: "asc" } });
  return {
    dayLabel: WEEKDAYS.find((d) => d.code === day)?.label ?? "Today",
    items: items.filter((i) => servedOn(i.days, day)),
  };
}

/** The message staff receive. `plain` drops emoji and symbols for cheaper SMS. */
export function buildMenuMessage(opts: {
  companyName: string;
  dayLabel: string;
  dishes: string[];
  closesAt: Date;
  url: string;
  plain?: boolean;
}) {
  const { companyName, dayLabel, dishes, closesAt, url, plain } = opts;
  const lines = [
    plain ? `${companyName} Lunch - ${dayLabel} menu` : `🍽️ *${companyName} Lunch — ${dayLabel}'s menu*`,
    "",
    ...dishes.map((d) => (plain ? `- ${d}` : `• ${d}`)),
    "",
    plain ? `Order before ${formatTime(closesAt)}:` : `⏰ Order before *${formatTime(closesAt)}*`,
    url,
  ];
  return lines.join("\n");
}
