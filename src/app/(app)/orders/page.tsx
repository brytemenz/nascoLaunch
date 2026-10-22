import Link from "next/link";
import { getGuest } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { formatDate, formatTime, money } from "@/lib/format";

export const metadata = { title: "My Orders" };
export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const guest = await getGuest();
  if (!guest) {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center animate-rise">
        <p className="eyebrow">History</p>
        <h1 className="page-title mt-3">My orders</h1>
        <p className="mt-4 text-lg text-muted">Place an order from this device and your lunch history will appear here.</p>
        <Link href="/" className="btn-primary mt-8">Go to the menu</Link>
      </div>
    );
  }
  const [orders, settings] = await Promise.all([
    db.order.findMany({
      where: { userId: guest.id },
      include: { items: true, round: true },
      orderBy: { round: { date: "desc" } },
      take: 60,
    }),
    getSettings(),
  ]);

  const spent = orders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="animate-rise">
      <p className="eyebrow">History</p>
      <h1 className="page-title mt-3">My orders</h1>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:max-w-md">
        <div className="card p-5">
          <div className="text-sm text-muted">Lunches ordered</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums">{orders.length}</div>
        </div>
        {settings.showPrices && (
          <div className="card p-5">
            <div className="text-sm text-muted">Total value</div>
            <div className="mt-1 text-3xl font-semibold tabular-nums">{money(spent, settings.currency)}</div>
          </div>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="card mt-8 p-12 text-center text-muted">Your past lunches will show up here.</div>
      ) : (
        <div className="mt-8 space-y-3">
          {orders.map((order) => (
            <article key={order.id} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
              <div className="w-36 shrink-0">
                <div className="font-semibold">{formatDate(order.round.date)}</div>
                <div className="text-sm text-subtle">{order.round.title}</div>
              </div>
              <div className="flex flex-1 flex-wrap gap-1.5">
                {order.items.map((i) => (
                  <span key={i.id} className="chip-muted">{i.quantity}× {i.name}</span>
                ))}
                {order.notes && <span className="text-xs text-subtle self-center">“{order.notes}”</span>}
              </div>
              <div className="flex items-center gap-4 sm:justify-end">
                {order.round.status === "OPEN" ? (
                  <span className="chip-brand">Open until {formatTime(order.round.closesAt)}</span>
                ) : (
                  <span className="chip-success">Sent</span>
                )}
                {settings.showPrices && <span className="w-28 text-right font-semibold tabular-nums">{money(order.total, settings.currency)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
