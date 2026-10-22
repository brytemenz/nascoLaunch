"use client";

import { useState, useTransition } from "react";
import { smsMenuToStaff } from "@/actions/admin";
import { FormMessage } from "../FormMessage";
import { Icon } from "../Icon";
import { Spinner } from "../SubmitButton";
import { Sheet } from "./Sheet";

type Props = {
  roundId: string;
  message: string; // WhatsApp-formatted message
  url: string;
  dayLabel: string;
  dishCount: number;
  staffCount: number;
};

export function ShareMenu({ roundId, message, url, dayLabel, dishCount, staffCount }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState<"message" | "link" | null>(null);
  const [state, setState] = useState<{ error?: string; success?: string }>();
  const [pending, start] = useTransition();
  const isLocal = /localhost|127\.0\.0\.1/.test(url);

  async function copy(text: string, what: "message" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setState({ error: "Couldn't copy. Select the text and copy it manually." });
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: `${dayLabel}'s lunch menu`, text: message });
    } catch {
      /* cancelled */
    }
  }

  function smsStaff() {
    if (!confirm(`Text the menu to ${staffCount} ${staffCount === 1 ? "person" : "people"}? Each SMS uses Arkesel credit.`)) return;
    start(async () => setState(await smsMenuToStaff(roundId)));
  }

  const canNativeShare = typeof navigator !== "undefined" && "share" in navigator;

  return (
    <>
      <button className="btn-secondary" onClick={() => setOpen(true)}>
        <Icon name="share" className="h-4 w-4" /> Share menu
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={`Share ${dayLabel}'s menu`}>
        <p className="-mt-3 mb-5 text-sm text-muted">
          {dishCount} {dishCount === 1 ? "dish" : "dishes"} · staff tap the link to order
        </p>

        {/* Preview */}
        <div className="rounded-2xl bg-[#0b141a] p-3">
          <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-[#1f2c34] px-4 py-3 text-[14px] leading-relaxed text-white/90">
            {message}
          </div>
        </div>

        {isLocal && (
          <p className="mt-3 rounded-xl border border-brand/25 bg-brand/10 px-3 py-2 text-xs text-brand-light">
            The link points to this computer ({url}). Staff can only open it once the app is online — set APP_URL after deploying.
          </p>
        )}

        <div className="mt-5 grid gap-2">
          <a
            href={`https://wa.me/?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn h-12 bg-[#25d366] text-black hover:bg-[#3be07a]"
          >
            <Icon name="whatsapp" className="h-5 w-5" /> Share on WhatsApp
          </a>
          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary" onClick={() => copy(message, "message")}>
              <Icon name={copied === "message" ? "check" : "copy"} className="h-4 w-4" />
              {copied === "message" ? "Copied" : "Copy message"}
            </button>
            <button className="btn-secondary" onClick={() => copy(url, "link")}>
              <Icon name={copied === "link" ? "check" : "link"} className="h-4 w-4" />
              {copied === "link" ? "Copied" : "Copy link"}
            </button>
          </div>
          {canNativeShare && (
            <button className="btn-secondary" onClick={nativeShare}>
              <Icon name="share" className="h-4 w-4" /> More options…
            </button>
          )}
          <button className="btn-secondary" onClick={smsStaff} disabled={pending || staffCount === 0}>
            {pending ? <Spinner /> : <Icon name="sms" className="h-4 w-4" />}
            {staffCount === 0 ? "SMS staff (no numbers yet)" : `SMS all staff (${staffCount})`}
          </button>
        </div>
        <div className="mt-4">
          <FormMessage state={state} />
        </div>
      </Sheet>
    </>
  );
}
