import Link from "next/link";
import { NewRoundForm } from "@/components/admin/NewRoundForm";
import { RoundDetail } from "@/components/admin/RoundDetail";
import { Icon } from "@/components/Icon";
import { db, getSettings } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { autoCloseDueRounds } from "@/lib/rounds";
import { twilioConfigured } from "@/lib/messaging";

export const metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminHome() {
  await autoCloseDueRounds();
  const [open, last, menuCount, settings] = await Promise.all([
    db.lunchRound.findFirst({ where: { status: "OPEN" } }),
    db.lunchRound.findFirst({ where: { status: "CLOSED" }, orderBy: { closedAt: "desc" }, include: { _count: { select: { orders: true } } } }),
    db.menuItem.count({ where: { available: true } }),
    getSettings(),
  ]);

  const setupWarnings: { text: string; href: string }[] = [];
  if (menuCount === 0) setupWarnings.push({ text: "Add items to the menu", href: "/admin/menu" });
  if (!settings.restaurantPhone && !settings.restaurantWhatsapp) setupWarnings.push({ text: "Add the restaurant's phone number", href: "/admin/settings" });
  if (!twilioConfigured("SMS")) setupWarnings.push({ text: "SMS isn't set up — messages are simulated", href: "/admin/settings" });

  return (
    <div className="space-y-8">
      {setupWarnings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {setupWarnings.map((w) => (
            <Link key={w.text} href={w.href} className="chip-brand h-8 px-3 hover:bg-brand/20">
              {w.text} <Icon name="arrow" className="h-3.5 w-3.5" />
            </Link>
          ))}
        </div>
      )}

      {open ? (
        <RoundDetail roundId={open.id} />
      ) : (
        <>
          <NewRoundForm />
          {last && (
            <Link href={`/admin/rounds/${last.id}`} className="card flex items-center justify-between p-6 transition hover:border-line-strong">
              <div>
                <div className="text-sm text-muted">Last round</div>
                <div className="mt-1 font-semibold">{last.title}</div>
                <div className="text-sm text-subtle">{formatDate(last.date)} · {last._count.orders} {last._count.orders === 1 ? "order" : "orders"}</div>
              </div>
              <Icon name="arrow" className="h-5 w-5 text-muted" />
            </Link>
          )}
        </>
      )}
    </div>
  );
}
