import { MenuManager } from "@/components/admin/MenuManager";
import { db, getSettings } from "@/lib/db";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const [items, settings] = await Promise.all([
    db.menuItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    getSettings(),
  ]);
  return (
    <div className="animate-rise">
      <MenuManager
        currency={settings.currency}
        showPrices={settings.showPrices}
        items={items.map((i) => ({ id: i.id, name: i.name, description: i.description, category: i.category, price: i.price, emoji: i.emoji, days: i.days, imageUrl: i.imageUrl, available: i.available }))}
      />
    </div>
  );
}
