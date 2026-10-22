"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./Icon";

type Tab = { href: string; label: string; icon: IconName };

/** iOS-style bottom tab bar, phones only. */
export function TabBar({ admin }: { admin: boolean }) {
  const pathname = usePathname();
  const tabs: Tab[] = [
    { href: "/", label: "Order", icon: "bag" },
    { href: "/orders", label: "My Orders", icon: "history" },
    ...(admin ? [{ href: "/admin", label: "Admin", icon: "grid" } as Tab] : []),
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[#111113]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      aria-label="Main"
    >
      <div className="mx-auto flex h-16 max-w-md items-stretch justify-around">
        {tabs.map((t) => {
          const active = t.href === "/" ? pathname === "/" : pathname.startsWith(t.href);
          return (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors active:scale-95 ${
                active ? "text-brand" : "text-subtle"
              }`}
            >
              <Icon name={t.icon} className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
