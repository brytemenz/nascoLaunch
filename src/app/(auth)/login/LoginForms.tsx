"use client";

import { useActionState, useRef, useState } from "react";
import { forgotPin, login, loginWithPin } from "@/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { PinInput } from "@/components/PinInput";
import { SubmitButton } from "@/components/SubmitButton";

type Mode = "pin" | "forgot" | "admin";

/** Staff sign in with phone + PIN. Admins use /login?admin for email + password. */
export function LoginForms({ admin }: { admin: boolean }) {
  const [mode, setMode] = useState<Mode>(admin ? "admin" : "pin");
  const [phone, setPhone] = useState("");

  return (
    <>
      {mode === "pin" && <PinLogin phone={phone} setPhone={setPhone} onForgot={() => setMode("forgot")} />}
      {mode === "forgot" && <ForgotPin phone={phone} setPhone={setPhone} onBack={() => setMode("pin")} />}
      {mode === "admin" && <AdminLogin onBack={() => setMode("pin")} />}

    </>
  );
}

function PhoneField({ phone, setPhone }: { phone: string; setPhone: (v: string) => void }) {
  return (
    <div>
      <label className="label" htmlFor="phone">Phone number</label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        required
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        className="input"
        placeholder="024 000 0000"
      />
    </div>
  );
}

function PinLogin({ phone, setPhone, onForgot }: { phone: string; setPhone: (v: string) => void; onForgot: () => void }) {
  const [state, action] = useActionState(loginWithPin, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight">Welcome back</h2>
      <p className="mt-2 text-muted">Sign in with your phone number and PIN.</p>
      <form ref={formRef} action={action} className="mt-8 space-y-5">
        <PhoneField phone={phone} setPhone={setPhone} />
        <div>
          <span className="label">PIN</span>
          <PinInput name="pin" label="4-digit PIN" onComplete={() => phone && formRef.current?.requestSubmit()} />
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full h-12" pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <button onClick={onForgot} className="text-brand-light hover:text-brand font-medium cursor-pointer">Forgot PIN?</button>
      </p>
    </>
  );
}

function ForgotPin({ phone, setPhone, onBack }: { phone: string; setPhone: (v: string) => void; onBack: () => void }) {
  const [state, action] = useActionState(forgotPin, undefined);
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight">Reset your PIN</h2>
      <p className="mt-2 text-muted">We&apos;ll text you a link to set a new PIN.</p>
      <form action={action} className="mt-8 space-y-5">
        <PhoneField phone={phone} setPhone={setPhone} />
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full h-12" pendingText="Sending…">Text me a link</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <button onClick={onBack} className="text-muted hover:text-fg cursor-pointer">← Back to sign in</button>
      </p>
    </>
  );
}

function AdminLogin({ onBack }: { onBack: () => void }) {
  const [state, action] = useActionState(login, undefined);
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight">Admin sign in</h2>
      <p className="mt-2 text-muted">Manage the menu, staff and deliveries.</p>
      <form action={action} className="mt-8 space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" required className="input" placeholder="admin@nasco.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required className="input" placeholder="••••••••" />
        </div>
        <FormMessage state={state} />
        <SubmitButton className="btn-primary w-full h-12" pendingText="Signing in…">Sign in</SubmitButton>
      </form>
      <p className="mt-6 text-center text-sm">
        <button onClick={onBack} className="text-muted hover:text-fg cursor-pointer">← Staff sign in</button>
      </p>
    </>
  );
}
