"use client";

import { useMemo, useState, useTransition } from "react";
import { cancelOrder, saveOrder } from "@/actions/orders";
import { money } from "@/lib/format";
import { Icon } from "./Icon";
import { Spinner } from "./SubmitButton";
import { useConfirm } from "./Confirm";

type MenuItem = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  emoji: string | null;
  imageUrl: string | null;
};

type Props = {
  roundId: string;
  currency: string;
  menu: MenuItem[];
  existing: { id: string; notes: string; items: { menuItemId: string; quantity: number }[] } | null;
  forOthers: { id: string; name: string; summary: string }[];
  colleagues: { id: string; name: string; department: string | null }[];
  alreadyOrdered: string[]; // people with an order this round
  showPrices: boolean;
  dayLabel: string;
};

const GUEST_KINDS = [
  { code: "VISITOR", label: "Visitor" },
  { code: "INTERN", label: "Intern" },
  { code: "NSS", label: "National Service" },
  { code: "CONTRACTOR", label: "Contractor" },
  { code: "OTHER", label: "Other" },
] as const;
type GuestKind = (typeof GUEST_KINDS)[number]["code"];

const fieldClass =
  "h-11 w-full rounded-xl bg-white/5 border border-line px-3 text-sm outline-none placeholder:text-subtle focus:border-brand/60 disabled:opacity-50";

export function OrderBoard({ roundId, currency, menu, existing, forOthers, colleagues, alreadyOrdered, showPrices, dayLabel }: Props) {
  const mine = existing?.items[0]?.menuItemId ?? null;

  // "me" = your own order; "other" = for a colleague or a guest.
  const [mode, setMode] = useState<"me" | "other">("me");
  const [selected, setSelected] = useState<string | null>(mine);
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [category, setCategory] = useState("All");
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const confirm = useConfirm();

  // Ordering for someone else
  const [who, setWho] = useState<"colleague" | "guest">("colleague");
  const [colleagueId, setColleagueId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestKind, setGuestKind] = useState<GuestKind>("VISITOR");
  const [guestNote, setGuestNote] = useState("");

  const forOther = mode === "other";
  const hasOrder = !!existing && !forOther;

  const sorted = useMemo(() => {
    const rank = (c: string) => ({ mains: 0, light: 1, sides: 2, desserts: 3, drinks: 4 })[c.toLowerCase()] ?? 2.5;
    return [...menu].sort((a, b) => rank(a.category) - rank(b.category) || a.category.localeCompare(b.category));
  }, [menu]);
  const categories = useMemo(() => ["All", ...new Set(sorted.map((m) => m.category))], [sorted]);
  const visible = category === "All" ? sorted : sorted.filter((m) => m.category === category);
  const dish = menu.find((m) => m.id === selected) ?? null;

  const colleague = colleagues.find((c) => c.id === colleagueId) ?? null;
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return colleagues.slice(0, 6);
    return colleagues.filter((c) => `${c.name} ${c.department ?? ""}`.toLowerCase().includes(q)).slice(0, 6);
  }, [colleagues, search]);

  const dirty = !hasOrder || selected !== mine || notes.trim() !== (existing?.notes ?? "");

  function flash(result: { ok: boolean; message: string }) {
    setToast(result);
    setTimeout(() => setToast(null), 4000);
  }

  function switchMode(next: "me" | "other") {
    if (next === mode) return;
    setMode(next);
    setSelected(next === "other" ? null : mine);
    setNotes(next === "other" ? "" : existing?.notes ?? "");
  }

  function pick(id: string) {
    setSelected((cur) => (cur === id ? null : id));
  }

  function submit() {
    if (!selected) return;
    if (forOther) {
      if (who === "colleague" && !colleagueId) return flash({ ok: false, message: "Choose who you're ordering for" });
      if (who === "guest" && guestName.trim().length < 2) return flash({ ok: false, message: "Enter their name" });
      if (who === "guest" && guestKind === "OTHER" && !guestNote.trim()) return flash({ ok: false, message: "Say who they are, e.g. Driver" });
    }
    startTransition(async () => {
      const result = await saveOrder({
        roundId,
        menuItemId: selected,
        notes,
        forUserId: forOther && who === "colleague" ? colleagueId : null,
        forGuest: forOther && who === "guest" ? { name: guestName, kind: guestKind, note: guestNote } : null,
      });
      if (result.ok && forOther) {
        setSelected(null);
        setNotes("");
        setColleagueId(null);
        setSearch("");
        setGuestName("");
        setGuestNote("");
      }
      flash(result);
    });
  }

  async function cancel(orderId: string, label: string) {
    const ok = await confirm({
      title: `Cancel ${label}?`,
      message: "You can order again before ordering closes.",
      confirmLabel: "Cancel order",
      cancelLabel: "Keep it",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      const result = await cancelOrder(orderId);
      if (result.ok && orderId === existing?.id) {
        setSelected(null);
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

  const tab = (active: boolean) =>
    `h-9 rounded-full px-4 text-sm font-medium transition cursor-pointer ${active ? "bg-fg text-black" : "text-muted hover:text-fg"}`;

  return (
    <>
      {/* Who is this order for? */}
      <div className="mt-6 flex flex-col gap-4 sm:mt-12 sm:flex-row sm:items-center sm:justify-between">
        <div className="grid grid-cols-2 rounded-full border border-line bg-card p-1 sm:inline-flex sm:self-start">
          <button onClick={() => switchMode("me")} className={tab(mode === "me")}>{existing ? "My order" : "For me"}</button>
          <button onClick={() => switchMode("other")} className={tab(mode === "other")}>For someone else</button>
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
        <div className="card mt-4 space-y-4 p-4 animate-rise sm:p-5">
          <div className="grid grid-cols-2 rounded-full bg-white/5 p-1 text-sm">
            <button onClick={() => setWho("colleague")} className={tab(who === "colleague")}>A colleague</button>
            <button onClick={() => setWho("guest")} className={tab(who === "guest")}>Not on the list</button>
          </div>

          {who === "colleague" ? (
            colleague ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-brand/40 bg-brand/10 px-4 py-3">
                <div>
                  <div className="font-medium">{colleague.name}</div>
                  {colleague.department && <div className="text-xs text-muted">{colleague.department}</div>}
                </div>
                <button onClick={() => setColleagueId(null)} className="text-sm text-brand-light hover:text-brand cursor-pointer">Change</button>
              </div>
            ) : (
              <div>
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search staff by name" aria-label="Search staff" className={fieldClass} />
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {matches.map((c) => {
                    const done = alreadyOrdered.includes(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          onClick={() => setColleagueId(c.id)}
                          disabled={done}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm hover:bg-white/5 active:bg-white/10 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                        >
                          <span className="font-medium">{c.name}</span>
                          {done ? <span className="chip-success">Ordered</span> : <span className="text-xs text-subtle">{c.department}</span>}
                        </button>
                      </li>
                    );
                  })}
                  {matches.length === 0 && (
                    <li className="px-4 py-3 text-sm text-muted">
                      No one found.{" "}
                      <button onClick={() => { setWho("guest"); setGuestName(search); }} className="text-brand-light hover:text-brand cursor-pointer">
                        Add them as a guest
                      </button>
                    </li>
                  )}
                </ul>
              </div>
            )
          ) : (
            <div className="space-y-3">
              <input value={guestName} onChange={(e) => setGuestName(e.target.value)} placeholder="Their full name" aria-label="Their name" maxLength={60} className={fieldClass} />
              <div>
                <div className="mb-2 text-xs text-subtle">Who are they?</div>
                <div className="flex flex-wrap gap-2">
                  {GUEST_KINDS.map((k) => (
                    <button
                      key={k.code}
                      onClick={() => setGuestKind(k.code)}
                      className={`h-9 rounded-full px-3.5 text-sm font-medium transition cursor-pointer ${
                        guestKind === k.code ? "bg-brand text-black" : "bg-white/5 text-muted border border-line hover:text-fg"
                      }`}
                    >
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>
              {guestKind === "OTHER" && (
                <input value={guestNote} onChange={(e) => setGuestNote(e.target.value)} placeholder="e.g. Driver, Consultant" aria-label="Who are they" maxLength={40} className={fieldClass} />
              )}
            </div>
          )}
        </div>
      )}

      {/* Orders you placed for others */}
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

      <p className="mt-5 text-sm text-subtle">Choose one meal{forOther ? " for them" : ""}.</p>

      {/* Menu: list rows on phones, cards on larger screens */}
      <div className="mt-3 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
        {visible.map((item, i) => {
          const on = selected === item.id;
          const photo = item.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.imageUrl} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]" />
          ) : (
            <div className="grid h-full place-items-center text-4xl sm:text-6xl">{item.emoji || "🍲"}</div>
          );
          const choice = (
            <span
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition ${
                on ? "bg-brand text-black animate-pop" : "border border-line bg-elevated text-fg"
              }`}
            >
              {on ? <><Icon name="check" className="h-4 w-4" strokeWidth={2.6} /> Chosen</> : "Choose"}
            </span>
          );
          return (
            <button
              key={item.id}
              onClick={() => pick(item.id)}
              aria-pressed={on}
              style={{ animationDelay: `${Math.min(i, 12) * 40}ms` }}
              className={`card group relative block w-full overflow-hidden text-left transition-all duration-300 animate-rise cursor-pointer active:scale-[0.99] sm:hover:-translate-y-0.5 sm:hover:border-line-strong ${
                on ? "border-brand/70! shadow-[0_0_0_1px_rgb(255_122_0/0.4),0_24px_60px_-24px_rgb(255_122_0/0.6)]" : ""
              }`}
            >
              {/* Phone: row */}
              <div className="flex items-center gap-3 p-2.5 sm:hidden">
                <div className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-2xl bg-elevated">
                  {photo}
                  {on && <span className="absolute inset-0 rounded-2xl ring-2 ring-inset ring-brand" />}
                </div>
                <div className="flex min-w-0 flex-1 flex-col self-stretch py-1 pr-1">
                  <h3 className="text-[16px] font-semibold leading-snug tracking-tight">{item.name}</h3>
                  {item.description && <p className="mt-0.5 text-[13px] text-muted line-clamp-1">{item.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                    <span className="text-sm font-semibold tabular-nums text-muted">{showPrices ? money(item.price, currency) : ""}</span>
                    {choice}
                  </div>
                </div>
              </div>

              {/* Tablet & desktop: card */}
              <div className="hidden h-full flex-col sm:flex">
                <div className="relative aspect-[4/3] overflow-hidden bg-elevated">
                  {photo}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/10 to-transparent" />
                  {on && (
                    <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-brand text-black shadow-lg animate-pop">
                      <Icon name="check" className="h-4 w-4" strokeWidth={2.8} />
                    </span>
                  )}
                </div>
                <div className="relative -mt-6 flex flex-1 flex-col px-5 pb-5">
                  <h3 className="text-[18px] font-semibold tracking-tight">{item.name}</h3>
                  {item.description && <p className="mt-1 text-sm leading-relaxed text-muted line-clamp-2">{item.description}</p>}
                  <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                    <span className="text-[16px] font-semibold tabular-nums text-muted">{showPrices ? money(item.price, currency) : ""}</span>
                    {choice}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Order bar */}
      <div className="fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-40 px-3 pb-3 sm:bottom-0 sm:px-4 sm:pb-6">
        <div
          className={`mx-auto max-w-3xl rounded-[26px] border border-line-strong bg-[#161618] p-3 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.9)] transition-all duration-500 ${
            dish || hasOrder ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
          }`}
        >
          {dish && (
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              placeholder="Add a note — e.g. no pepper, extra shito"
              className={`mb-3 ${fieldClass}`}
            />
          )}
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-2xl bg-white/5">
              {dish?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dish.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center"><Icon name="bag" className="h-5 w-5" /></div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-[13px] text-muted">
                {forOther
                  ? who === "colleague"
                    ? colleague ? `For ${colleague.name}` : "For someone else"
                    : guestName ? `For ${guestName}` : "For a guest"
                  : hasOrder ? (dirty ? "Unsaved change" : "Your order") : "Your meal"}
              </div>
              <div className="truncate text-[16px] font-semibold">
                {dish ? dish.name : "Nothing chosen"}
                {dish && showPrices && <span className="ml-2 text-muted">{money(dish.price, currency)}</span>}
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              {hasOrder && (
                <button onClick={() => cancel(existing!.id, "your order")} disabled={pending} className={dish ? "btn-ghost btn-sm hidden sm:inline-flex" : "btn-danger"}>
                  Cancel{dish ? " order" : ""}
                </button>
              )}
              {dish && (
                <button onClick={submit} disabled={pending || !dirty} className="btn-primary h-12 px-6">
                  {pending ? <Spinner /> : hasOrder && !dirty ? <Icon name="check" className="h-4 w-4" strokeWidth={2.5} /> : null}
                  {forOther ? "Place order" : hasOrder ? (dirty ? "Change order" : "Ordered") : "Place order"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top))] z-50 flex justify-center px-4 animate-rise sm:top-20" role="status">
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
