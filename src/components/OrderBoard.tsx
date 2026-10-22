"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelOrder, saveOrder } from "@/actions/orders";
import { money } from "@/lib/format";
import { Icon } from "./Icon";
import { Spinner } from "./SubmitButton";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  emoji: string | null;
  imageUrl: string | null;
};

type Line = { menuItemId: string; quantity: number };

type Props = {
  roundId: string;
  currency: string;
  menu: MenuItem[];
  existing: { id: string; notes: string; items: Line[] } | null;
  forOthers: { id: string; name: string; summary: string }[];
  guest: { name: string; phone: string } | null;
  showPrices: boolean;
  dayLabel: string;
};

const fieldClass =
  "h-10 w-full rounded-xl bg-white/5 border border-line px-3 text-sm outline-none placeholder:text-subtle focus:border-brand/60 disabled:opacity-50";

const toQty = (items: Line[]) => Object.fromEntries(items.map((i) => [i.menuItemId, i.quantity]));
const digits = (s: string) => s.replace(/\D/g, "").length;

export function OrderBoard({ roundId, currency, menu, existing, forOthers, guest, showPrices, dayLabel }: Props) {
  // "me" edits your own order; "other" builds a fresh order for a colleague.
  const [mode, setMode] = useState<"me" | "other">("me");
  const [qty, setQty] = useState<Record<string, number>>(() => toQty(existing?.items ?? []));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [category, setCategory] = useState("All");
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(guest?.name ?? "");
  const [phone, setPhone] = useState(guest?.phone ?? "");
  const [editingMe, setEditingMe] = useState(!guest);
  const [otherName, setOtherName] = useState("");
  const [otherPhone, setOtherPhone] = useState("");

  const forOther = mode === "other";
  const hasOrder = !!existing && !forOther;

  // Mains first, drinks last, anything else in between.
  const sorted = useMemo(() => {
    const rank = (c: string) => ({ mains: 0, light: 1, sides: 2, desserts: 3, drinks: 4 })[c.toLowerCase()] ?? 2.5;
    return [...menu].sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category));
  }, [menu]);
  const categories = useMemo(() => ["All", ...new Set(sorted.map((m) => m.category))], [sorted]);
  const visible = category === "All" ? sorted : sorted.filter((m) => m.category === category);

  const lines = sorted.filter((m) => (qty[m.id] ?? 0) > 0).map((m) => ({ ...m, quantity: qty[m.id]! }));
  const count = lines.reduce((n, l) => n + l.quantity, 0);
  const total = lines.reduce((n, l) => n + l.quantity * l.price, 0);

  const signature = (items: Line[], note: string) =>
    JSON.stringify([[...items].sort((a, b) => a.menuItemId.localeCompare(b.menuItemId)).map((i) => `${i.menuItemId}:${i.quantity}`), note.trim()]);
  const dirty =
    !hasOrder ||
    (!!guest && name.trim() !== guest.name) ||
    signature(existing?.items ?? [], existing?.notes ?? "") !== signature(lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })), notes);

  function change(id: string, delta: number) {
    setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(20, (q[id] ?? 0) + delta)) }));
  }

  function flash(result: { ok: boolean; message: string }) {
    setToast(result);
    setTimeout(() => setToast(null), 4000);
  }

  function switchMode(next: "me" | "other") {
    if (next === mode) return;
    setMode(next);
    setQty(next === "other" ? {} : toQty(existing?.items ?? []));
    setNotes(next === "other" ? "" : existing?.notes ?? "");
  }

  function submit() {
    if (name.trim().length < 2 || digits(phone) < 10) {
      setEditingMe(true);
      flash({ ok: false, message: forOther ? "Enter your own name and phone first" : "Enter your name and phone number to order" });
      return;
    }
    if (forOther && (otherName.trim().length < 2 || digits(otherPhone) < 10)) {
      flash({ ok: false, message: "Enter their name and phone number" });
      return;
    }
    startTransition(async () => {
      const result = await saveOrder({
        roundId,
        me: { name, phone },
        forOther: forOther ? { name: otherName, phone: otherPhone } : null,
        notes,
        items: lines.map((l) => ({ menuItemId: l.id, quantity: l.quantity })),
      });
      if (result.ok) {
        setEditingMe(false);
        if (forOther) {
          setQty({});
          setNotes("");
          setOtherName("");
          setOtherPhone("");
        }
      }
      flash(result);
    });
  }

  function cancel(orderId: string, label: string) {
    if (!confirm(`Cancel ${label}?`)) return;
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (result.ok && orderId === existing?.id) {
        setQty({});
        setNotes("");
      }
      flash(result);
    });
  }

  if (menu.length === 0) {
    return (
      <div className="card mt-12 p-12 text-center text-muted">
        {dayLabel ? `No dishes are set for ${dayLabel} yet.` : "The menu is being prepared."} Please check back in a moment.
      </div>
    );
  }

  return (
    <>
      {/* Who is this order for? */}
      <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex self-start rounded-full border border-line bg-card p-1">
          {(["me", "other"] as const).map((m) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`h-9 rounded-full px-4 text-sm font-medium transition cursor-pointer ${mode === m ? "bg-fg text-black" : "text-muted hover:text-fg"}`}
            >
              {m === "me" ? (existing ? "My order" : "For me") : "For someone else"}
            </button>
          ))}
        </div>
        {categories.length > 2 && (
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition cursor-pointer ${
                  c === category ? "bg-brand text-black" : "bg-card text-muted border border-line hover:text-fg"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {forOther && (
        <div className="card mt-4 grid gap-3 p-4 animate-rise sm:grid-cols-2 sm:p-5">
          <p className="text-sm text-muted sm:col-span-2">
            Ordering for a colleague. The order goes under their name, and they can&apos;t order again today.
          </p>
          <input value={otherName} onChange={(e) => setOtherName(e.target.value)} placeholder="Their name" aria-label="Their name" maxLength={60} className={fieldClass} />
          <input value={otherPhone} onChange={(e) => setOtherPhone(e.target.value)} placeholder="Their phone number" aria-label="Their phone number" type="tel" inputMode="tel" className={fieldClass} />
        </div>
      )}

      {/* Orders you placed for colleagues */}
      {forOthers.length > 0 && (
        <div className="card mt-4 p-4 sm:p-5">
          <div className="text-sm font-medium">You ordered for</div>
          <ul className="mt-2 divide-y divide-line">
            {forOthers.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="font-medium">{o.name}</span>
                <span className="min-w-0 flex-1 truncate text-muted">{o.summary}</span>
                <button onClick={() => cancel(o.id, `the order for ${o.name}`)} disabled={pending} className="text-subtle hover:text-danger cursor-pointer">
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Menu */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((item, i) => {
          const q = qty[item.id] ?? 0;
          return (
            <article
              key={item.id}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              className={`card group relative flex flex-col overflow-hidden transition-all duration-300 animate-rise hover:-translate-y-0.5 hover:border-line-strong ${
                q > 0 ? "border-brand/60! shadow-[0_0_0_1px_rgb(255_122_0/0.35),0_24px_60px_-24px_rgb(255_122_0/0.55)]" : ""
              }`}
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
                {item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
                ) : (
                  <div className="grid h-full place-items-center text-6xl">{item.emoji || "🍲"}</div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
                {q > 0 && (
                  <span className="absolute right-3 top-3 grid h-8 min-w-8 place-items-center rounded-full bg-brand px-2 text-sm font-bold text-black shadow-lg animate-pop">
                    {q}
                  </span>
                )}
              </div>

              <div className="relative -mt-6 flex flex-1 flex-col px-5 pb-5">
                <h3 className="text-[18px] font-semibold tracking-tight">{item.name}</h3>
                {item.description && <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-2">{item.description}</p>}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="text-[16px] font-semibold tabular-nums text-muted">{showPrices ? money(item.price, currency) : ""}</span>
                  {q === 0 ? (
                    <button onClick={() => change(item.id, 1)} className="btn-secondary btn-sm hover:border-brand/40 hover:text-brand-light">
                      <Icon name="plus" className="h-4 w-4" strokeWidth={2.2} /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 rounded-full bg-brand p-1 text-black animate-pop">
                      <button onClick={() => change(item.id, -1)} aria-label={`Remove one ${item.name}`} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/10 cursor-pointer">
                        <Icon name="minus" className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                      <span className="w-6 text-center text-sm font-semibold tabular-nums">{q}</span>
                      <button onClick={() => change(item.id, 1)} aria-label={`Add one ${item.name}`} className="grid h-7 w-7 place-items-center rounded-full hover:bg-black/10 cursor-pointer">
                        <Icon name="plus" className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-subtle">
        Photos: Pexels and Wikimedia Commons ·{" "}
        <a href="/menu/CREDITS.md" className="underline hover:text-muted">credits</a>
      </p>

      {/* Bag bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:pb-6">
        <div
          className={`mx-auto max-w-3xl rounded-[26px] border border-line-strong bg-[#161618] p-3 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] backdrop-blur-2xl transition-all duration-500 ${
            count > 0 || hasOrder ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          }`}
        >
          {count > 0 && (
            <div className="px-2 pb-3">
              <div className="flex flex-wrap gap-1.5">
                {lines.map((l) => (
                  <span key={l.id} className="chip-brand">{l.quantity}× {l.name}</span>
                ))}
              </div>

              {editingMe || !guest ? (
                <div className="mt-3">
                  {forOther && <div className="mb-1.5 text-xs text-subtle">Your details</div>}
                  <div className="grid grid-cols-2 gap-2">
                    <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" placeholder="Your name" aria-label="Your name" className={fieldClass} />
                    <input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="Your phone number"
                      aria-label="Phone number"
                      disabled={!!existing && !!guest}
                      className={fieldClass}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted">
                    {forOther ? (
                      <>Ordering for <span className="font-medium text-fg">{otherName || "…"}</span> · placed by {guest.name}</>
                    ) : (
                      <>Ordering as <span className="font-medium text-fg">{guest.name}</span> · {guest.phone}</>
                    )}
                  </span>
                  {!forOther && (
                    <button onClick={() => setEditingMe(true)} className="shrink-0 text-brand-light hover:text-brand cursor-pointer">Edit</button>
                  )}
                </div>
              )}

              <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={200} placeholder="Add a note — e.g. no pepper, extra shito" className={`mt-2 ${fieldClass}`} />
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/5">
              <Icon name="bag" className="h-5 w-5" />
              {count > 0 && (
                <span key={count} className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-[11px] font-bold text-black animate-pop">
                  {count}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-muted">
                {forOther ? "Order for someone else" : hasOrder ? (dirty ? "Unsaved changes" : "Order placed") : "Your order"}
              </div>
              <div className="text-lg font-semibold tabular-nums">
                {showPrices ? money(total, currency) : count === 0 ? "Nothing yet" : `${count} item${count === 1 ? "" : "s"}`}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {hasOrder && count > 0 && (
                <button onClick={() => cancel(existing!.id, "your order")} disabled={pending} className="btn-ghost btn-sm hidden sm:inline-flex">
                  Cancel order
                </button>
              )}
              {hasOrder && count === 0 ? (
                <button onClick={() => cancel(existing!.id, "your order")} disabled={pending} className="btn-danger">
                  {pending && <Spinner />} Cancel order
                </button>
              ) : (
                <button onClick={submit} disabled={pending || count === 0 || !dirty} className="btn-primary h-12 px-6">
                  {pending ? <Spinner /> : hasOrder && !dirty ? <Icon name="check" className="h-4 w-4" strokeWidth={2.5} /> : null}
                  {forOther ? "Place their order" : hasOrder ? (dirty ? "Update order" : "Ordered") : "Place order"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 top-20 z-50 flex justify-center px-4 animate-rise" role="status">
          <div className={`flex items-center gap-2.5 rounded-full border bg-[#161618]/95 px-5 py-3 text-sm font-medium shadow-2xl backdrop-blur-xl ${toast.ok ? "border-success/30" : "border-danger/30"}`}>
            <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full ${toast.ok ? "bg-success text-black" : "bg-danger text-white"}`}>
              <Icon name={toast.ok ? "check" : "x"} className="h-3 w-3" strokeWidth={3} />
            </span>
            {toast.message}
          </div>
        </div>
      )}
    </>
  );
}
