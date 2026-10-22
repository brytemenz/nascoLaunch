import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { Icon } from "@/components/Icon";
import { OrderBoard } from "@/components/OrderBoard";
import { getAdmin, getGuest } from "@/lib/auth";
import { db, getSettings } from "@/lib/db";
import { describeCutoff, getActiveRound } from "@/lib/rounds";
import { formatDate, formatTime, money, servedOn, weekdayOf, WEEKDAYS } from "@/lib/format";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: process.env.NEXT_PUBLIC_APP_TIMEZONE || "Africa/Accra" }).format(new Date()));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function OrderPage() {
  const [guest, admin, round, settings] = await Promise.all([getGuest(), getAdmin(), getActiveRound(), getSettings()]);
  const hello = guest ? `${greeting()}, ${guest.name.split(" ")[0]}` : greeting();

  if (!round) {
    return (
      <EmptyState
        title="No lunch round yet"
        body="When an admin opens ordering, today's menu will appear here."
        admin={!!admin}
        greeting={`${hello}.`}
      />
    );
  }

  const myOrder = guest
    ? await db.order.findUnique({
        where: { userId_roundId: { userId: guest.id, roundId: round.id } },
        include: { items: true },
      })
    : null;

  if (round.status !== "OPEN") {
    return (
      <div className="mx-auto max-w-2xl animate-rise">
        <p className="eyebrow">{formatDate(round.date)}</p>
        <h1 className="page-title mt-3">Ordering is closed.</h1>
        <p className="mt-4 text-lg text-muted">
          {round.title} closed at {formatTime(round.closedAt ?? round.closesAt)} and was sent to {settings.restaurantName}.
        </p>

        <div className="card mt-10 p-6 sm:p-8">
          {myOrder ? (
            <>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Your order</h2>
                <span className="chip-success"><Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.5} /> Sent to restaurant</span>
              </div>
              <ul className="mt-5 divide-y divide-line">
                {myOrder.items.map((item) => (
                  <li key={item.id} className="flex justify-between py-3">
                    <span><span className="text-brand-light font-medium">{item.quantity}×</span> {item.name}</span>
                    {settings.showPrices && <span className="text-muted tabular-nums">{money(item.price * item.quantity, settings.currency)}</span>}
                  </li>
                ))}
              </ul>
              {myOrder.notes && <p className="mt-3 text-sm text-muted">Note: {myOrder.notes}</p>}
              {settings.showPrices && (
                <div className="mt-4 flex justify-between border-t border-line pt-4 font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{money(myOrder.total, settings.currency)}</span>
                </div>
              )}
            </>
          ) : (
            <p className="text-muted">{guest ? "You didn't place an order for this round." : "No order from this device for this round."}</p>
          )}
        </div>
        <p className="mt-6 text-center text-sm text-subtle">The next menu will appear here when ordering opens again.</p>
      </div>
    );
  }

  // Orders this device placed on behalf of colleagues.
  const forOthers = guest
    ? await db.order.findMany({
        where: { roundId: round.id, placedById: guest.id },
        include: { user: true, items: true },
        orderBy: { createdAt: "asc" },
      })
    : [];

  // Only dishes served on this round's weekday.
  const day = weekdayOf(round.date);
  const dayLabel = WEEKDAYS.find((d) => d.code === day)?.label ?? "";
  const menu = (
    await db.menuItem.findMany({
      where: { available: true },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    })
  ).filter((m) => servedOn(m.days, day));

  return (
    <>
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-8 animate-rise">
        <div>
          <p className="eyebrow">{hello}</p>
          <h1 className="mt-2 text-[34px] font-semibold leading-[1.05] tracking-[-0.03em] sm:mt-3 sm:text-5xl">
            What&apos;s for <span className="text-gradient">lunch</span>?
          </h1>
          <p className="mt-2 text-[15px] text-muted sm:mt-4 sm:text-lg">
            {round.title} · from {settings.restaurantName}
          </p>
        </div>

        {/* Phone: compact countdown chip */}
        <div className="flex items-center gap-2 self-start rounded-full border border-brand/25 bg-brand/10 px-3.5 py-2 text-[13px] sm:hidden">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
          </span>
          <span className="text-muted">Closes in</span>
          <span className="font-semibold text-brand-light"><Countdown to={round.closesAt.toISOString()} compact /></span>
          <span className="text-subtle">· {formatTime(round.closesAt)}</span>
        </div>

        {/* Larger screens: countdown card */}
        <div className="card hidden shrink-0 px-6 py-5 sm:block">
          <div className="flex items-center gap-2 text-[13px] text-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
            </span>
            Ordering closes in
          </div>
          <div className="mt-1"><Countdown to={round.closesAt.toISOString()} /></div>
          <div className="text-xs text-subtle">{describeCutoff(round.closesAt)}</div>
        </div>
      </section>

      <OrderBoard
        forOthers={forOthers.map((o) => ({
          id: o.id,
          name: o.user.name,
          summary: o.items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
        }))}
        roundId={round.id}
        currency={settings.currency}
        showPrices={settings.showPrices}
        dayLabel={dayLabel}
        guest={guest ? { name: guest.name, phone: guest.phone ?? "" } : null}
        menu={menu.map((m) => ({ id: m.id, name: m.name, description: m.description, category: m.category, price: m.price, emoji: m.emoji, imageUrl: m.imageUrl }))}
        existing={
          myOrder
            ? { id: myOrder.id, notes: myOrder.notes ?? "", items: myOrder.items.filter((i) => i.menuItemId).map((i) => ({ menuItemId: i.menuItemId!, quantity: i.quantity })) }
            : null
        }
      />
    </>
  );
}

function EmptyState({ title, body, admin, greeting }: { title: string; body: string; admin: boolean; greeting: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center py-16 text-center animate-rise">
      <div className="grid h-20 w-20 place-items-center rounded-[26px] border border-line bg-card text-4xl shadow-[0_20px_60px_-20px_rgb(255_122_0/0.5)]">🍽️</div>
      <p className="eyebrow mt-8">{greeting}</p>
      <h1 className="page-title mt-3">{title}</h1>
      <p className="mt-4 text-lg text-muted">{body}</p>
      {admin && (
        <Link href="/admin" className="btn-primary mt-8">
          Open ordering <Icon name="arrow" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
