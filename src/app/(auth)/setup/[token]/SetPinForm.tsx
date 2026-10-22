"use client";

import { useActionState } from "react";
import { setPin } from "@/actions/auth";
import { FormMessage } from "@/components/FormMessage";
import { PinInput } from "@/components/PinInput";
import { SubmitButton } from "@/components/SubmitButton";

export function SetPinForm({ token }: { token: string }) {
  const [state, action] = useActionState(setPin, undefined);
  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="token" value={token} />
      <div>
        <span className="label">Choose a 4-digit PIN</span>
        <PinInput name="pin" label="New PIN" autoFocus autoComplete="new-password" />
      </div>
      <div>
        <span className="label">Enter it again</span>
        <PinInput name="confirm" label="Confirm PIN" autoComplete="new-password" />
      </div>
      <FormMessage state={state} />
      <SubmitButton className="btn-primary w-full h-12" pendingText="Saving…">Save PIN and continue</SubmitButton>
    </form>
  );
}
