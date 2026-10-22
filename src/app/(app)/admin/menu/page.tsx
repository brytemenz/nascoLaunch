import { MenuManager } from "@/components/admin/MenuManager";
import { db } from "@/lib/db";

export const metadata = { title: "Menu" };
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const items = await db.menuItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] });
  return (
    <div className="animate-rise">
      <MenuManager
        items={items.map((i) => ({ id: i.id, name: i.name, description: i.description, category: i.category, price: i.price, emoji: i.emoji, days: i.days, imageUrl: i.imageUrl, available: i.available }))}
      />
    </div>
  );
}
