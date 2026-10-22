"use client";

import { useActionState, useState } from "react";
import { createRound } from "@/actions/admin";
import { FormMessage } from "../FormMessage";
import { SubmitButton } from "../SubmitButton";

function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Default cut-off: 11:00 today, or one hour from now if that has passed. */
function defaultCutoff() {
  const d = new Date();
  d.setHours(11, 0, 0, 0);
  if (d.getTime() < Date.now() + 10 * 60_000) return new Date(Math.ceil((Date.now() + 60 * 60_000) / 900_000) * 900_000);
  return d;
}

export function NewRoundForm() {
  const [state, action] = useActionState(createRound, undefined);
  const [local, setLocal] = useState(() => toLocalInput(defaultCutoff()));
  const iso = local ? new Date(local).toISOString() : "";
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <form action={action} className="card relative overflow-hidden p-6 sm:p-10">
      <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand/15 blur-[90px]" />
      <div className="relative">
        <p className="eyebrow">Start a round</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight">Open ordering for lunch</h2>
        <p className="mt-2 max-w-lg text-muted">
          Everyone can order until the cut-off. At the cut-off, the combined order goes to the restaurant automatically.
        </p>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="title">Round name</label>
            <input id="title" name="title" className="input" defaultValue={`Lunch · ${today}`} required />
          </div>
          <div>
            <label className="label" htmlFor="closesAtLocal">Cut-off time</label>
            <input
              id="closesAtLocal"
              type="datetime-local"
              className="input [color-scheme:dark]"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              required
            />
            <input type="hidden" name="closesAt" value={iso} />
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
          <SubmitButton pendingText="Opening…" className="btn-primary h-12 px-7">Open ordering</SubmitButton>
          <div className="flex-1"><FormMessage state={state} /></div>
        </div>
      </div>
    </form>
  );
}
