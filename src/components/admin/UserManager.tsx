"use client";

import { useActionState, useState, useTransition } from "react";
import { createUser, resendPinLink, resetUserPassword, setUserRole, toggleUserActive } from "@/actions/admin";
import type { FormState } from "@/actions/auth";
import { Avatar } from "../Avatar";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { Spinner, SubmitButton } from "../SubmitButton";
import { Sheet } from "./Sheet";

type User = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  role: string;
  kind: string;
  kindLabel: string | null;
  active: boolean;
  orders: number;
  pinSet: boolean;
  linkSentAt: string | null;
  locked: boolean;
};

const KINDS = [
  { code: "STAFF", label: "Staff" },
  { code: "INTERN", label: "Intern" },
  { code: "NSS", label: "National Service" },
  { code: "CONTRACTOR", label: "Contractor" },
  { code: "VISITOR", label: "Visitor" },
  { code: "OTHER", label: "Other" },
];

export function UserManager({ users, meId }: { users: User[]; meId: string }) {
  const [adding, setAdding] = useState(false);
  const [resetFor, setResetFor] = useState<User | null>(null);
  const [linkResult, setLinkResult] = useState<{ name: string; state: FormState } | null>(null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState<FormState>();

  // People with a phone or email can sign in; the rest are guests ordered for by colleagues.
  const members = users.filter((u) => u.phone || u.email);
  const guests = users.filter((u) => !u.phone && !u.email);

  const q = query.trim().toLowerCase();
  const match = (u: User) => !q || [u.name, u.email ?? "", u.phone ?? "", u.department ?? "", u.kindLabel ?? ""].some((v) => v.toLowerCase().includes(q));
  const shown = members.filter(match);
  const shownGuests = guests.filter(match);

  function sendLink(u: User) {
    setBusy(u.id);
    start(async () => {
      const state = await resendPinLink(u.id);
      setBusy(null);
      setLinkResult({ name: u.name, state });
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">People</p>
          <h1 className="page-title mt-3">Your team</h1>
          <p className="mt-3 text-muted">
            {members.filter((u) => u.active).length} active · {members.filter((u) => u.pinSet).length} signed up ·{" "}
            {members.filter((u) => u.role === "ADMIN").length} admins
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
            <div key={u.id} className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4 ${i > 0 ? "border-t border-line" : ""} ${u.active ? "" : "opacity-50"}`}>
              <Avatar name={u.name} size="h-10 w-10 text-sm" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate font-medium">{u.name}</span>
                  {me && <span className="chip-muted">You</span>}
                  {u.kindLabel && <span className="chip-muted">{u.kindLabel}</span>}
                  {!u.active && <span className="chip-danger">Inactive</span>}
                  {u.phone &&
                    (u.locked ? (
                      <span className="chip-danger">Locked</span>
                    ) : u.pinSet ? (
                      <span className="chip-success">PIN set</span>
                    ) : u.linkSentAt ? (
                      <span className="chip-brand">Link sent</span>
                    ) : (
                      <span className="chip-muted">Not invited</span>
                    ))}
                </div>
                <div className="truncate text-sm text-muted">{[u.phone, u.email, u.department].filter(Boolean).join(" · ")}</div>
              </div>
              <div className="hidden w-20 text-right text-sm text-subtle md:block">{u.orders} orders</div>
              <div className="flex flex-wrap items-center gap-1">
                {u.phone && u.active && (
                  <button className="btn-ghost btn-sm" disabled={pending} onClick={() => sendLink(u)}>
                    {busy === u.id ? <Spinner /> : <Icon name="sms" className="h-4 w-4" />}
                    {u.pinSet ? "Reset PIN" : "Send PIN link"}
                  </button>
                )}
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
                {u.role === "ADMIN" && u.email && (
                  <button className="btn-ghost btn-sm" onClick={() => setResetFor(u)}>Password</button>
                )}
                <button className="btn-ghost btn-sm" disabled={me || pending} onClick={() => start(() => toggleUserActive(u.id))}>
                  {u.active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          );
        })}
        {shown.length === 0 && <p className="p-8 text-center text-sm text-muted">{q ? `No one matches “${query}”.` : "No one yet. Add your first person."}</p>}
      </div>

      {shownGuests.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-[0.12em] text-subtle">Guests</h2>
          <p className="mb-3 text-sm text-muted">Visitors, interns and others ordered for by a colleague. They can&apos;t sign in.</p>
          <div className="card overflow-hidden">
            {shownGuests.map((u, i) => (
              <div key={u.id} className={`flex items-center gap-4 px-5 py-3 ${i > 0 ? "border-t border-line" : ""}`}>
                <Avatar name={u.name} size="h-9 w-9 text-[13px]" />
                <span className="flex-1 truncate font-medium">{u.name}</span>
                {u.kindLabel && <span className="chip-muted">{u.kindLabel}</span>}
                <span className="w-20 text-right text-sm text-subtle">{u.orders} orders</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a person">
        {adding && <AddUserForm />}
      </Sheet>
      <Sheet open={!!resetFor} onClose={() => setResetFor(null)} title="Reset password">
        {resetFor && <ResetForm user={resetFor} />}
      </Sheet>
      <Sheet open={!!linkResult} onClose={() => setLinkResult(null)} title="PIN link">
        {linkResult && <LinkResult name={linkResult.name} state={linkResult.state} />}
      </Sheet>
    </>
  );
}

/** Shows the outcome of sending a PIN link, with the link to share if the SMS didn't go out. */
function LinkResult({ name, state }: { name: string; state: FormState }) {
  const [copied, setCopied] = useState(false);
  if (!state) return null;
  return (
    <div className="space-y-4">
      <FormMessage state={{ error: state.error, success: state.success }} />
      {state.link && (
        <>
          <div className="break-all rounded-xl border border-line bg-elevated px-4 py-3 text-sm text-muted">{state.link}</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(state.link!).catch(() => {});
                setCopied(true);
              }}
            >
              <Icon name={copied ? "check" : "copy"} className="h-4 w-4" /> {copied ? "Copied" : "Copy link"}
            </button>
            <a
              className="btn h-11 bg-[#25d366] text-black hover:bg-[#3be07a]"
              target="_blank"
              rel="noopener noreferrer"
              href={`https://wa.me/?text=${encodeURIComponent(`Hi ${name.split(" ")[0]}, set your lunch PIN here: ${state.link}`)}`}
            >
              <Icon name="whatsapp" className="h-4 w-4" /> WhatsApp
            </a>
          </div>
        </>
      )}
    </div>
  );
}

function AddUserForm() {
  const [state, action] = useActionState(createUser, undefined);
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
  const [kind, setKind] = useState("STAFF");
  const isAdmin = role === "ADMIN";

  // After adding, show the result (and the link if the SMS didn't go out).
  if (state?.success || state?.link) {
    return (
      <div className="space-y-5">
        <LinkResult name="" state={state} />
        <p className="text-sm text-subtle">They sign in with their phone number and the PIN they choose.</p>
      </div>
    );
  }

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
      <input type="hidden" name="kind" value={kind} />
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
      {!isAdmin && (
        <div>
          <span className="label">Type</span>
          <div className="flex flex-wrap gap-2">
            {KINDS.filter((k) => k.code !== "VISITOR").map((k) => (
              <button
                type="button"
                key={k.code}
                onClick={() => setKind(k.code)}
                className={`h-9 rounded-full px-3.5 text-sm font-medium transition cursor-pointer ${kind === k.code ? "bg-brand text-black" : "bg-elevated text-muted border border-line hover:text-fg"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          {kind === "OTHER" && <input name="kindNote" className="input mt-3" placeholder="e.g. Driver" maxLength={40} required />}
        </div>
      )}
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
      <p className="text-sm text-subtle">
        {isAdmin
          ? "Admins sign in with email and password. Add a phone to also send them a PIN link."
          : "We'll text them a link to set a 4-digit PIN. They sign in with their phone number and PIN."}
      </p>
      <FormMessage state={state?.error ? state : undefined} />
      <SubmitButton className="btn-primary w-full h-12" pendingText="Adding…">
        {isAdmin ? "Add admin" : "Add and send PIN link"}
      </SubmitButton>
    </form>
  );
}

function ResetForm({ user }: { user: User }) {
  const [state, setState] = useState<FormState>();
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
