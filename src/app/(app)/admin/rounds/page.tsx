import Link from "next/link";
import { Icon } from "@/components/Icon";
import { db, getSettings } from "@/lib/db";
import { formatDate, formatTime, money } from "@/lib/format";

export const metadata = { title: "Rounds" };
export const dynamic = "force-dynamic";

export default async function RoundsPage() {
  const [rounds, settings] = await Promise.all([
    db.lunchRound.findMany({
      orderBy: { date: "desc" },
      take: 100,
      include: { orders: { select: { total: true } }, dispatches: { select: { status: true, channel: true }, orderBy: { createdAt: "desc" } } },
    }),
    getSettings(),
  ]);

  return (
    <div className="animate-rise">
      <p className="eyebrow">History</p>
      <h1 className="page-title mt-3">Lunch rounds</h1>

      {rounds.length === 0 ? (
        <div className="card mt-10 p-12 text-center text-muted">No rounds yet. Open one from the Today tab.</div>
      ) : (
        <div className="card mt-10 overflow-hidden">
          {rounds.map((r, i) => {
            const total = r.orders.reduce((s, o) => s + o.total, 0);
            // Only the latest attempt per channel counts, so a successful re-send clears a failure.
            const latest = new Map<string, string>();
            for (const d of r.dispatches) if (!latest.has(d.channel)) latest.set(d.channel, d.status);
            const failed = [...latest.values()].includes("FAILED");
            return (
              <Link
                key={r.id}
                href={`/admin/rounds/${r.id}`}
                className={`flex items-center gap-4 px-6 py-4 transition hover:bg-white/[0.03] ${i > 0 ? "border-t border-line" : ""}`}
              >
                <div className="w-24 shrink-0">
                  <div className="font-semibold">{formatDate(r.date, { weekday: undefined })}</div>
                  <div className="text-xs text-subtle">{formatTime(r.closesAt)}</div>
                </div>
                <div className="min-w-0 flex-1 truncate text-muted">{r.title}</div>
                <div className="hidden w-24 text-right text-sm text-muted sm:block">{r.orders.length} {r.orders.length === 1 ? "order" : "orders"}</div>
                <div className="hidden w-32 text-right text-sm font-medium tabular-nums sm:block">{money(total, settings.currency)}</div>
                <div className="w-28 text-right">
                  {r.status === "OPEN" ? (
                    <span className="chip-brand">Open</span>
                  ) : failed ? (
                    <span className="chip-danger">Send failed</span>
                  ) : (
                    <span className="chip-success">Sent</span>
                  )}
                </div>
                <Icon name="arrow" className="h-4 w-4 text-subtle" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
