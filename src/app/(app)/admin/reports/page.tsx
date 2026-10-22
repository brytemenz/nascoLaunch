import Link from "next/link";
import { SpendChart } from "@/components/admin/SpendChart";
import { Icon } from "@/components/Icon";
import { getSettings } from "@/lib/db";
import { money } from "@/lib/format";
import { buildReport, resolvePeriod } from "@/lib/reports";

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

const RANGES = [
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "year", label: "This year" },
];

const fmt = (d: string) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" }).format(new Date(`${d}T00:00:00Z`));

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const params = await searchParams;
  const period = resolvePeriod(params);
  const [report, settings] = await Promise.all([buildReport(period), getSettings()]);
  const cur = settings.currency;
  const query = params.from ? `from=${period.from}&to=${period.to}` : `range=${params.range ?? "month"}`;
  const activeRange = params.from ? "custom" : (params.range ?? "month");

  return (
    <div className="space-y-6 animate-rise">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="eyebrow">Reports</p>
          <h1 className="page-title mt-3">Lunch expenses</h1>
          <p className="mt-3 text-muted">
            {fmt(period.from)} – {fmt(period.to)} · {money(settings.mealPrice, cur)} per meal
          </p>
        </div>
        <a href={`/api/admin/reports/export?${query}`} className="btn-secondary self-start lg:self-auto">
          <Icon name="download" className="h-4 w-4" /> Download for Excel
        </a>
      </div>

      {/* Period filter — one row above the charts */}
      <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1 overflow-x-auto rounded-full border border-line bg-card p-1 [scrollbar-width:none]">
          {RANGES.map((r) => (
            <Link
              key={r.key}
              href={`/admin/reports?range=${r.key}`}
              className={`shrink-0 rounded-full px-4 py-1.5 text-[13px] font-medium transition ${
                activeRange === r.key ? "bg-brand text-black" : "text-muted hover:text-fg"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
        <form className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-sm sm:flex" action="/admin/reports">
          <input type="date" name="from" defaultValue={period.from} className="input h-9 min-w-0 rounded-full px-3 text-sm [color-scheme:dark] sm:w-auto" aria-label="From" />
          <span className="text-subtle">to</span>
          <input type="date" name="to" defaultValue={period.to} className="input h-9 min-w-0 rounded-full px-3 text-sm [color-scheme:dark] sm:w-auto" aria-label="To" />
          <button className={`btn-sm col-span-3 ${activeRange === "custom" ? "btn-primary" : "btn-secondary"}`}>Apply</button>
        </form>
      </div>

      {/* Headline numbers */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <div className="card col-span-2 p-5 lg:col-span-1">
          <div className="text-sm text-muted">Total spend</div>
          <div className="mt-1 text-3xl font-semibold tabular-nums text-brand-light">{money(report.total, cur)}</div>
        </div>
        <Stat label="Meals" value={report.count.toLocaleString("en-GB")} note={report.guestMeals ? `${report.guestMeals} for guests` : undefined} />
        <Stat label="People fed" value={String(report.people)} />
        <Stat label="Average per day" value={money(report.avgPerDay, cur)} note={`${report.days} day${report.days === 1 ? "" : "s"} with orders`} />
      </section>

      {/* Spend per day */}
      <section className="card p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Spend per day</h2>
        <p className="mb-6 text-sm text-muted">Weekdays in the period. Hover or tap a bar for details.</p>
        <SpendChart days={report.perDay} currency={cur} />
      </section>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* By person */}
        <section className="card overflow-hidden lg:col-span-3">
          <div className="p-5 pb-3 sm:p-6 sm:pb-3">
            <h2 className="text-lg font-semibold">By person</h2>
            <p className="text-sm text-muted">{report.byPerson.length} {report.byPerson.length === 1 ? "person" : "people"}</p>
          </div>
          {report.byPerson.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-subtle">No meals in this period.</p>
          ) : (
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-card text-left text-xs text-subtle">
                  <tr>
                    <th className="px-5 py-2 font-medium sm:px-6">Name</th>
                    <th className="hidden px-2 py-2 font-medium sm:table-cell">Department</th>
                    <th className="px-2 py-2 text-right font-medium">Meals</th>
                    <th className="px-5 py-2 text-right font-medium sm:px-6">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byPerson.map((p) => (
                    <tr key={`${p.name}-${p.type}`} className="border-t border-line">
                      <td className="px-5 py-2.5 sm:px-6">
                        <span className="font-medium">{p.name}</span>
                        {p.type !== "Staff" && <span className="chip-muted ml-2">{p.type}</span>}
                      </td>
                      <td className="hidden px-2 py-2.5 text-muted sm:table-cell">{p.department ?? "—"}</td>
                      <td className="px-2 py-2.5 text-right tabular-nums">{p.meals}</td>
                      <td className="px-5 py-2.5 text-right font-medium tabular-nums sm:px-6">{money(p.cost, cur)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="space-y-6 lg:col-span-2">
          <Breakdown title="By department" rows={report.byDepartment} total={report.total} currency={cur} />
          <Breakdown title="Staff and guests" rows={report.byType} total={report.total} currency={cur} />
          <Breakdown title="By meal" rows={report.byDish} total={report.total} currency={cur} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card p-5">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-xl font-semibold tabular-nums sm:text-2xl">{value}</div>
      {note && <div className="mt-0.5 text-xs text-subtle">{note}</div>}
    </div>
  );
}

/** Ranked list with a share-of-spend bar under each row. */
function Breakdown({ title, rows, total, currency }: { title: string; rows: { key: string; meals: number; cost: number }[]; total: number; currency: string }) {
  return (
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-subtle">Nothing yet.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {rows.slice(0, 8).map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium">{r.key}</span>
                <span className="shrink-0 tabular-nums">
                  {money(r.cost, currency)}
                  <span className="text-subtle"> · {r.meals}</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/5">
                <div className="h-full rounded-full" style={{ width: `${total ? (r.cost / total) * 100 : 0}%`, background: "#e86a00" }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
