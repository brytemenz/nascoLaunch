export const TIMEZONE = process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Accra";

export function money(amount: number | null | undefined, currency = "GH₵") {
  return `${currency} ${Number(amount ?? 0).toFixed(2)}`;
}

export function formatDate(date: Date, opts: Intl.DateTimeFormatOptions = {}) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    weekday: "short",
    day: "numeric",
    month: "short",
    ...opts,
  }).format(date);
}

export function formatTime(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Normalise a phone number to E.164-ish form (+233...). */
export function normalisePhone(raw: string) {
  const digits = raw.replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  // Local Ghana number like 024xxxxxxx
  if (digits.startsWith("0")) return `+233${digits.slice(1)}`;
  return `+${digits}`;
}

export const WEEKDAYS = [
  { code: "MON", label: "Monday", short: "Mon" },
  { code: "TUE", label: "Tuesday", short: "Tue" },
  { code: "WED", label: "Wednesday", short: "Wed" },
  { code: "THU", label: "Thursday", short: "Thu" },
  { code: "FRI", label: "Friday", short: "Fri" },
  { code: "SAT", label: "Saturday", short: "Sat" },
  { code: "SUN", label: "Sunday", short: "Sun" },
] as const;

/** Weekday code ("MON"…"SUN") of a date in the app's timezone. */
export function weekdayOf(date: Date) {
  const short = new Intl.DateTimeFormat("en-GB", { timeZone: TIMEZONE, weekday: "short" }).format(date);
  return short.slice(0, 3).toUpperCase();
}

export function parseDays(days: string | null | undefined) {
  return (days ?? "").split(",").map((d) => d.trim()).filter(Boolean);
}

/** True if a dish tagged with `days` is served on `code`. Untagged dishes are served every day. */
export function servedOn(days: string | null | undefined, code: string) {
  const list = parseDays(days);
  return list.length === 0 || list.includes(code);
}

/** Calendar day (YYYY-MM-DD) of a date in the app's timezone. */
export function dayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export const PERSON_KINDS = [
  { code: "STAFF", label: "Staff" },
  { code: "VISITOR", label: "Visitor" },
  { code: "INTERN", label: "Intern" },
  { code: "NSS", label: "National Service" },
  { code: "CONTRACTOR", label: "Contractor" },
  { code: "OTHER", label: "Other" },
] as const;

/** "Visitor", "Intern", "Driver (Other)"… or null for regular staff. */
export function kindLabel(kind: string, note?: string | null) {
  if (kind === "STAFF") return null;
  if (kind === "OTHER") return note?.trim() || "Guest";
  return PERSON_KINDS.find((k) => k.code === kind)?.label ?? null;
}

/** Name with their type, e.g. "Kofi Mensah (Visitor)". */
export function displayName(p: { name: string; kind?: string | null; kindNote?: string | null }) {
  const label = kindLabel(p.kind ?? "STAFF", p.kindNote);
  return label ? `${p.name} (${label})` : p.name;
}
