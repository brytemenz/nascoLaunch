"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string };

function isActive(pathname: string, href: string) {
  if (href === "/" || href === "/admin") return pathname === href;
  return pathname.startsWith(href);
}

/** Top navigation links with a sliding pill for the active page. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-0.5 rounded-full border border-line bg-white/[0.03] p-1">
      {items.map((item) => {
        const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-3 py-1.5 text-[13px] sm:px-4 sm:text-[14px] font-medium transition-colors whitespace-nowrap ${
              active ? "bg-white/10 text-fg" : "text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Segmented control used for the admin sub-navigation. */
export function Segmented({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="inline-flex max-w-full overflow-x-auto rounded-full border border-line bg-card p-1 [scrollbar-width:none]">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all whitespace-nowrap ${
              active ? "bg-brand text-black shadow-[0_4px_16px_-4px_rgb(255_122_0/0.7)]" : "text-muted hover:text-fg"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
