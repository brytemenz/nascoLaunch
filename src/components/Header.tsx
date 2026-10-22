import { forgetMe, logout } from "@/actions/auth";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";

type Person = { name: string; phone?: string | null };

export function Header({ admin, guest }: { admin: Person | null; guest: Person | null }) {
  const person = admin ?? guest;
  // Admin link only for signed-in admins; others reach it via /login.
  const items: NavItem[] = [
    { href: "/", label: "Order" },
    { href: "/orders", label: "My Orders" },
    ...(admin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <header className="glass sticky top-0 z-40 border-b border-line pt-[env(safe-area-inset-top)]">
      <div className="mx-auto grid h-14 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:h-16 sm:px-6">
        <Logo />

        {/* Phones use the bottom tab bar instead */}
        <div className="hidden justify-center sm:flex">
          <NavLinks items={items} />
        </div>

        <div className="flex items-center justify-end gap-3">
          {person && (
            <>
              <div className="hidden text-right lg:block">
                <div className="text-[13px] font-medium leading-tight">{person.name}</div>
                <div className="text-[11px] text-subtle leading-tight">{admin ? "Administrator" : person.phone}</div>
              </div>
              <Avatar name={person.name} size="h-8 w-8 text-[12px] sm:h-9 sm:w-9 sm:text-[13px]" />
              <form action={admin ? logout : forgetMe}>
                <button
                  className="grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-white/5 hover:text-fg cursor-pointer"
                  title={admin ? "Sign out" : "Not you? Forget me on this device"}
                  aria-label={admin ? "Sign out" : "Forget me on this device"}
                >
                  <Icon name="logout" className="h-[18px] w-[18px]" />
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
