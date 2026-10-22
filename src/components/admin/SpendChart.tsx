"use client";

import { useState } from "react";

type Day = { date: string; meals: number; cost: number };

const BAR = "#e86a00"; // validated against the dark card surface
const BAR_HOVER = "#ff7a00";

function niceMax(v: number) {
  if (v <= 0) return 100;
  const step = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= v) return m * step;
  return 10 * step;
}

const fmtDay = (d: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...opts }).format(new Date(`${d}T00:00:00Z`));

/** Spend per day — one series, so the title names it and there's no legend. */
export function SpendChart({ days, currency }: { days: Day[]; currency: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...days.map((d) => d.cost)));
  const ticks = [0, max / 2, max];
  // Few enough date labels that they never collide, even on a phone.
  const labelEvery = Math.max(1, Math.ceil(days.length / 6));
  const money = (n: number) => `${currency} ${n.toLocaleString("en-GB", { maximumFractionDigits: 0 })}`;

  if (days.length === 0) return <p className="py-16 text-center text-sm text-subtle">No days in this period.</p>;

  return (
    <div>
      <div className="relative flex h-56 gap-3">
        {/* Y axis */}
        <div className="relative w-14 shrink-0 text-right text-[11px] tabular-nums text-subtle">
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ bottom: `${(t / max) * 100}%`, transform: "translateY(50%)" }}>
              {money(t)}
            </span>
          ))}
        </div>

        {/* Plot */}
        <div className="relative flex-1" onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ bottom: `${(t / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {days.map((d, i) => {
              const h = (d.cost / max) * 100;
              const active = hover === i;
              return (
                <button
                  type="button"
                  key={d.date}
                  aria-label={`${fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}: ${d.meals} meals, ${money(d.cost)}`}
                  className="relative flex h-full flex-1 items-end justify-center outline-none"
                  onMouseEnter={() => setHover(i)}
                  onFocus={() => setHover(i)}
                  onClick={() => setHover(i)}
                >
                  <span
                    className="block w-full max-w-7 rounded-t-[4px] transition-colors"
                    style={{ height: `${Math.max(h, d.cost > 0 ? 1.5 : 0)}%`, background: active ? BAR_HOVER : BAR }}
                  />
                  {active && (
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-xl border border-line-strong bg-[#1f1f22] px-3 py-2 text-left text-xs shadow-xl">
                      <span className="block text-muted">{fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="block font-semibold text-fg tabular-nums">{money(d.cost)}</span>
                      <span className="block text-muted">{d.meals} meal{d.meals === 1 ? "" : "s"}</span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* X axis */}
      <div className="ml-[4.25rem] mt-2 flex h-4 gap-[2px] text-[11px] text-subtle">
        {days.map((d, i) => (
          <span key={d.date} className="relative flex-1 tabular-nums">
            {i % labelEvery === 0 && (
              <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{fmtDay(d.date, { day: "numeric", month: "short" })}</span>
            )}
          </span>
        ))}
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-subtle hover:text-muted">View as table</summary>
        <table className="mt-3 w-full text-left">
          <thead className="text-xs text-subtle">
            <tr><th className="py-1 font-medium">Day</th><th className="py-1 text-right font-medium">Meals</th><th className="py-1 text-right font-medium">Cost</th></tr>
          </thead>
          <tbody>
            {days.map((d) => (
              <tr key={d.date} className="border-t border-line">
                <td className="py-1.5">{fmtDay(d.date, { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="py-1.5 text-right tabular-nums">{d.meals}</td>
                <td className="py-1.5 text-right tabular-nums">{money(d.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
