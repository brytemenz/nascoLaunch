import { UserManager } from "@/components/admin/UserManager";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { kindLabel } from "@/lib/format";

export const metadata = { title: "People" };
export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const me = await requireAdmin();
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: { _count: { select: { orders: true } } },
  });
  return (
    <div className="animate-rise">
      <UserManager
        meId={me.id}
        users={users.map((u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, department: u.department, role: u.role,
          kind: u.kind, kindLabel: kindLabel(u.kind, u.kindNote), active: u.active, orders: u._count.orders,
          pinSet: !!u.pinHash, linkSentAt: u.setupSentAt?.toISOString() ?? null,
          locked: !!u.lockedUntil && u.lockedUntil > new Date(),
        }))}
      />
    </div>
  );
}
