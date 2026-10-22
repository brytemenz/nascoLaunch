import { Segmented } from "@/components/NavLinks";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <>
      <div className="mb-10 flex justify-center sm:justify-start">
        <Segmented
          items={[
            { href: "/admin", label: "Today" },
            { href: "/admin/rounds", label: "Rounds" },
            { href: "/admin/reports", label: "Reports" },
            { href: "/admin/menu", label: "Menu" },
            { href: "/admin/users", label: "People" },
            { href: "/admin/settings", label: "Settings" },
          ]}
        />
      </div>
      {children}
    </>
  );
}
