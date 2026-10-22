"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { closeRound, deleteRound, extendRound, resendRound } from "@/actions/admin";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { Spinner } from "../SubmitButton";

export function RoundActions({ roundId, status, canDelete = false }: { roundId: string; status: string; canDelete?: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [state, setState] = useState<{ error?: string; success?: string }>();

  function run(key: string, fn: () => Promise<{ error?: string; success?: string } | void | undefined>) {
    setBusy(key);
    start(async () => {
      const result = await fn();
      if (result) setState(result);
      setBusy(null);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "OPEN" ? (
          <>
            <button
              className="btn-primary"
              disabled={pending}
              onClick={() =>
                confirm("Close ordering now and send the order to the restaurant?") &&
                run("close", async () => {
                  const result = await closeRound(roundId);
                  router.push(`/admin/rounds/${roundId}`);
                  return result;
                })
              }
            >
              {busy === "close" ? <Spinner /> : <Icon name="send" className="h-4 w-4" />} Close &amp; send now
            </button>
            <button className="btn-secondary" disabled={pending} onClick={() => run("extend", () => extendRound(roundId, 15))}>
              {busy === "extend" ? <Spinner /> : <Icon name="clock" className="h-4 w-4" />} +15 min
            </button>
          </>
        ) : (
          <button
            className="btn-secondary"
            disabled={pending}
            onClick={() => confirm("Send this order to the restaurant again?") && run("resend", () => resendRound(roundId))}
          >
            {busy === "resend" ? <Spinner /> : <Icon name="refresh" className="h-4 w-4" />} Re-send to restaurant
          </button>
        )}
        {canDelete && (
          <button
            className="btn-ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm("Delete this round and all its orders? This can't be undone.")) return;
              run("delete", async () => {
                await deleteRound(roundId);
                router.push("/admin/rounds");
              });
            }}
          >
            <Icon name="trash" className="h-4 w-4" /> Delete
          </button>
        )}
      </div>
      <FormMessage state={state} />
    </div>
  );
}
