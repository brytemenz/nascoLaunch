import { forgetMe, logout } from "@/actions/auth";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";
import { Logo } from "./Logo";
import { NavLinks, type NavItem } from "./NavLinks";

type Person = { name: string; phone?: string | null };

const items: NavItem[] = [
  { href: "/", label: "Order" },
  { href: "/orders", label: "My Orders" },
  { href: "/admin", label: "Admin" },
];

export function Header({ admin, guest }: { admin: Person | null; guest: Person | null }) {
  const person = admin ?? guest;

  return (
    <header className="glass sticky top-0 z-40 border-b border-line">
      <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-4 sm:px-6">
        {/* Logo: icon only on phones */}
        <div className="sm:hidden"><Logo subtitle={false} compact /></div>
        <div className="hidden sm:block"><Logo /></div>

        <div className="flex justify-center">
          <NavLinks items={items} />
        </div>

        <div className="flex items-center justify-end gap-3">
          {person && (
            <>
              <div className="hidden text-right lg:block">
                <div className="text-[13px] font-medium leading-tight">{person.name}</div>
                <div className="text-[11px] text-subtle leading-tight">{admin ? "Administrator" : person.phone}</div>
              </div>
              <span className="hidden sm:block"><Avatar name={person.name} /></span>
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
