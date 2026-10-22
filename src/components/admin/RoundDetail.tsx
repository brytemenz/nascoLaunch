import { Avatar } from "../Avatar";
import { Countdown } from "../Countdown";
import { Icon } from "../Icon";
import { RoundActions } from "./RoundActions";
import { ShareMenu } from "./ShareMenu";
import { appUrl, buildMenuMessage, menuForRound } from "@/lib/share";
import { buildRestaurantMessage, describeCutoff, getRoundWithOrders, summarise } from "@/lib/rounds";
import { displayName, formatDate, formatTime, money, normalisePhone } from "@/lib/format";
import { db, getSettings } from "@/lib/db";

export async function RoundDetail({ roundId, canDelete = false }: { roundId: string; canDelete?: boolean }) {
  const [round, settings, logs] = await Promise.all([
    getRoundWithOrders(roundId),
    getSettings(),
    db.dispatchLog.findMany({ where: { roundId }, orderBy: { createdAt: "desc" }, take: 20 }),
  ]);
  if (!round) return null;

  const s = summarise(round);

  // Message for "Share menu" (only while ordering is open).
  let share: { message: string; url: string; dayLabel: string; dishCount: number; staffCount: number } | null = null;
  if (round.status === "OPEN") {
    const [{ dayLabel, items }, url, staffCount] = await Promise.all([
      menuForRound(round),
      appUrl(),
      db.user.count({ where: { active: true, phone: { not: null } } }),
    ]);
    share = {
      dayLabel,
      url,
      staffCount,
      dishCount: items.length,
      message: buildMenuMessage({ companyName: settings.companyName, dayLabel, dishes: items.map((i) => i.name), closesAt: round.closesAt, url }),
    };
  }
  const maxQty = Math.max(1, ...s.items.map((i) => i.quantity));
  const open = round.status === "OPEN";
  const preview = buildRestaurantMessage(round, settings, "WHATSAPP");
  // Opens WhatsApp with the message ready to send — works without a WhatsApp API.
  const waNumber = normalisePhone(settings.restaurantWhatsapp || settings.restaurantPhone).replace(/\D/g, "");

  return (
    <div className="space-y-6 animate-rise">
      {/* Header */}
      <section className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <p className="eyebrow">{formatDate(round.date, { year: "numeric" })}</p>
            {open ? <span className="chip-brand">● Open</span> : <span className="chip-success">Closed &amp; sent</span>}
          </div>
          <h1 className="page-title mt-3">{round.title}</h1>
          <p className="mt-3 text-muted">
            {open
              ? `Closes ${describeCutoff(round.closesAt)} · sends to ${settings.restaurantName}`
              : `Closed ${round.closedAt ? `at ${formatTime(round.closedAt)}` : ""} · sent to ${settings.restaurantName}`}
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {open && share && (
            <ShareMenu
              roundId={round.id}
              message={share.message}
              url={share.url}
              dayLabel={share.dayLabel}
              dishCount={share.dishCount}
              staffCount={share.staffCount}
            />
          )}
          <RoundActions roundId={round.id} status={round.status} canDelete={canDelete} />
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="People ordered" value={String(s.people)} />
        <Stat label="Items" value={String(s.meals)} />
        <Stat label="Cost" value={money(s.total, settings.currency)} />
        <div className="card p-5">
          <div className="text-sm text-muted">{open ? "Time left" : "Status"}</div>
          <div className="mt-1 text-2xl font-semibold">
            {open ? <Countdown to={round.closesAt.toISOString()} compact /> : "Delivered"}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Item summary */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">What to prepare</h2>
          <p className="text-sm text-muted">Combined across everyone</p>
          {s.items.length === 0 ? (
            <p className="mt-8 text-sm text-subtle">No orders yet.</p>
          ) : (
            <ul className="mt-6 space-y-4">
              {s.items.map((item) => (
                <li key={item.name}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="tabular-nums"><span className="text-brand-light font-semibold">{item.quantity}</span><span className="text-subtle"> · {money(item.subtotal, settings.currency)}</span></span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand-dark to-brand-light" style={{ width: `${(item.quantity / maxQty) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* People */}
        <section className="card overflow-hidden lg:col-span-3">
          <div className="p-6 pb-4">
            <h2 className="text-lg font-semibold">Orders</h2>
            <p className="text-sm text-muted">{s.people} {s.people === 1 ? "person" : "people"}</p>
          </div>
          {round.orders.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-subtle">Orders will appear here as people place them.</p>
          ) : (
            <ul>
              {round.orders.map((order) => (
                <li key={order.id} className="flex items-start gap-3 border-t border-line px-6 py-4">
                  <Avatar name={order.user.name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-medium truncate">{displayName(order.user)}</span>
                      <span className="text-sm text-muted tabular-nums">{money(order.total, settings.currency)}</span>
                    </div>
                    <div className="mt-1 text-sm text-muted">
                      {order.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
                    </div>
                    {order.notes && <div className="mt-1 text-xs text-brand-light/80">“{order.notes}”</div>}
                    {order.placedBy && <div className="mt-1 text-xs text-subtle">Ordered by {order.placedBy.name}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Message preview */}
        <section className="card p-6 lg:col-span-3">
          <div className="flex items-center gap-2">
            <Icon name="whatsapp" className="h-5 w-5 text-success" />
            <h2 className="text-lg font-semibold">Message to restaurant</h2>
          </div>
          <p className="text-sm text-muted">
            {open ? "Preview — this is what will be sent at the cut-off." : "What was sent."}
          </p>
          {waNumber && (
            <a
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(preview)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary btn-sm mt-4 border-success/30 text-success hover:bg-success/10"
            >
              <Icon name="whatsapp" className="h-4 w-4" /> Send on WhatsApp
            </a>
          )}
          <div className="mt-5 rounded-2xl bg-[#0b141a] p-4">
            <div className="ml-auto max-w-md whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#005c4b] px-4 py-3 text-[14px] leading-relaxed text-white/95 shadow-lg">
              {preview}
            </div>
          </div>
        </section>

        {/* Delivery log */}
        <section className="card p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold">Delivery</h2>
          <p className="text-sm text-muted">WhatsApp and SMS attempts</p>
          {logs.length === 0 ? (
            <p className="mt-6 text-sm text-subtle">{open ? "Nothing sent yet." : "No delivery records."}</p>
          ) : (
            <ul className="mt-5 space-y-3">
              {logs.map((log) => (
                <li key={log.id} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${log.channel === "WHATSAPP" ? "bg-success/10 text-success" : "bg-brand/10 text-brand-light"}`}>
                    <Icon name={log.channel === "WHATSAPP" ? "whatsapp" : "sms"} className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{log.channel === "WHATSAPP" ? "WhatsApp" : "SMS"}</span>
                      <span className={log.status === "SENT" ? "chip-success" : log.status === "SIMULATED" ? "chip-muted" : "chip-danger"}>
                        {log.status.toLowerCase()}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate text-xs text-subtle">
                      {log.recipient} · {formatTime(log.createdAt)}
                    </div>
                    {log.detail && <div className="mt-1 text-xs text-muted break-words">{log.detail}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
