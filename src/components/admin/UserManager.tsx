"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createUser, resetUserPassword, setUserRole, toggleUserActive } from "@/actions/admin";
import { Avatar } from "../Avatar";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { SubmitButton } from "../SubmitButton";
import { Sheet } from "./Sheet";

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  role: string;
  active: boolean;
  orders: number;
};

export function UserManager({ users, meId }: { users: User[]; meId: string }) {
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [query, setQuery] = useState("");
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<{ error?: string; success?: string }>();

  const q = query.trim().toLowerCase();
  const shown = q
    ? users.filter((u) => [u.name, u.email ?? "", u.phone ?? "", u.department ?? ""].some((v) => v.toLowerCase().includes(q)))
    : users;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="page-title mt-3">Your team</h1>
          <p className="mt-3 text-muted">
            {users.filter((u) => u.active).length} active · {users.filter((u) => u.role === "ADMIN").length} admins
          </p>
        </div>
        <button className="btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus" className="h-4 w-4" strokeWidth={2.4} /> Add person
        </button>
      </div>

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name, phone or department" className="input mt-8 max-w-md" />

      {notice?.error && <div className="mt-4"><FormMessage state={notice} /></div>}

      <div className="card mt-4 overflow-hidden">
        {shown.map((u, i) => {
          const me = u.id === meId;
          return (
            <div key={u.id} className={`flex flex-wrap items-center gap-4 px-5 py-4 ${i > 0 ? "border-t border-line" : ""} ${u.active ? "" : "opacity-50"}`}>
              <Avatar name={u.name} size="h-10 w-10 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{u.name}</span>
                  {me && <span className="chip-muted">You</span>}
                  {!u.active && <span className="chip-danger">Inactive</span>}
                </div>
                <div className="truncate text-sm text-muted">
                  {[u.phone, u.email, u.department].filter(Boolean).join(" · ")}
                </div>
              </div>
              <div className="hidden w-24 text-right text-sm text-subtle md:block">{u.orders} orders</div>
              <select
                className="input h-9 w-32 rounded-full text-sm"
                value={u.role}
                disabled={me || pending}
                onChange={(e) => {
                  const role = e.target.value as "USER" | "ADMIN";
                  start(async () => setNotice(await setUserRole(u.id, role)));
                }}
                aria-label={`Role for ${u.name}`}
              >
                <option value="USER">Employee</option>
                <option value="ADMIN">Admin</option>
              </select>
              {u.role === "ADMIN" && (
                <button className="btn-ghost btn-sm" onClick={() => setResetFor(u)}>Reset password</button>
              )}
              <button
                className="btn-ghost btn-sm"
                disabled={me || pending}
                onClick={() => start(() => toggleUserActive(u.id))}
              >
                {u.active ? "Deactivate" : "Activate"}
              </button>
            </div>
          );
        })}
        {shown.length === 0 && <p className="p-8 text-center text-sm text-muted">No one matches “{query}”.</p>}
      </div>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a person">
        {adding && <AddUserForm onDone={() => setAdding(false)} />}
      </Sheet>
      <Sheet open={!!resetFor} onClose={() => setResetFor(null)} title={`Reset password`}>
        {resetFor && <ResetForm user={resetFor} />}
      </Sheet>
    </>
  );
}

function AddUserForm({ onDone }: { onDone: () => void }) {
  const [state, action] = useActionState(createUser, undefined);
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  useEffect(() => {
    if (state?.success) onDone();
  }, [state, onDone]);
  const isAdmin = role === "ADMIN";
  return (
    <form action={action} className="space-y-5">
      <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-elevated p-1">
        {(["USER", "ADMIN"] as const).map((r) => (
          <button
            type="button"
            key={r}
            onClick={() => setRole(r)}
            className={`h-9 rounded-full text-sm font-medium transition cursor-pointer ${role === r ? "bg-brand text-black" : "text-muted hover:text-fg"}`}
          >
            {r === "USER" ? "Employee" : "Admin"}
          </button>
        ))}
      </div>
      <input type="hidden" name="role" value={role} />
      <div>
        <label className="label" htmlFor="u-name">Full name</label>
        <input id="u-name" name="name" className="input" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="u-phone">Phone {isAdmin && <span className="text-subtle">(optional)</span>}</label>
          <input id="u-phone" name="phone" type="tel" className="input" placeholder="024 000 0000" required={!isAdmin} />
        </div>
        <div>
          <label className="label" htmlFor="u-dept">Department</label>
          <input id="u-dept" name="department" className="input" />
        </div>
      </div>
      {isAdmin && (
        <>
          <div>
            <label className="label" htmlFor="u-email">Email</label>
            <input id="u-email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="u-pass">Password</label>
            <input id="u-pass" name="password" type="text" minLength={8} className="input" placeholder="At least 8 characters" required />
          </div>
        </>
      )}
      {!isAdmin && (
        <p className="text-sm text-subtle">Employees don&apos;t need a password. They order with their name and phone number.</p>
      )}
      <FormMessage state={state?.error ? state : undefined} />
      <SubmitButton className="btn-primary w-full h-12" pendingText="Adding…">Add {isAdmin ? "admin" : "employee"}</SubmitButton>
    </form>
  );
}

function ResetForm({ user }: { user: User }) {
  const [state, setState] = useState<{ error?: string; success?: string }>();
  const [password, setPassword] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setState(await resetUserPassword(user.id, password)));
      }}
    >
      <p className="text-muted">Set a new password for <span className="text-fg">{user.name}</span>. Share it with them privately.</p>
      <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" minLength={8} className="input" placeholder="New password" required />
      <FormMessage state={state} />
      <button className="btn-primary w-full h-12" disabled={pending}>Update password</button>
    </form>
  );
}
