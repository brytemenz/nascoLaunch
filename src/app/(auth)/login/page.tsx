"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { SubmitButton } from "@/components/SubmitButton";

export default function LoginPage() {
  const [state, action] = useActionState(login, undefined);
  return (
    <>
      <h2 className="text-3xl font-semibold tracking-tight">Admin sign in</h2>
      <p className="mt-2 text-muted">Manage the menu, rounds and deliveries.</p>

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

      <p className="mt-8 text-center text-sm text-muted">
        Just here for lunch?{" "}
        <Link href="/" className="text-brand-light hover:text-brand font-medium">Go to the menu</Link>
      </p>
    </>
  );
}
