"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask | null>(null);

/**
 * In-app replacement for window.confirm():
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: "Delete this?", tone: "danger" }))) return;
 */
export function useConfirm(): Ask {
  const ask = useContext(ConfirmContext);
  if (!ask) throw new Error("useConfirm must be used inside <ConfirmProvider>");
  return ask;
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [dialog, setDialog] = useState<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  const ask = useCallback<Ask>((options) => new Promise((resolve) => setDialog({ ...options, resolve })), []);

  const close = useCallback(
    (ok: boolean) => {
      dialog?.resolve(ok);
      setDialog(null);
    },
    [dialog],
  );

  return (
    <ConfirmContext.Provider value={ask}>
      {children}
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "default",
  onClose,
}: ConfirmOptions & { onClose: (ok: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    // Capture phase so Escape doesn't also close a sheet underneath.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        onClose(false);
      }
    };
    window.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-6" role="alertdialog" aria-modal aria-labelledby="confirm-title" aria-describedby={message ? "confirm-message" : undefined}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade" onClick={() => onClose(false)} />
      <div className="relative w-full max-w-[340px] overflow-hidden rounded-[22px] border border-line-strong bg-[#1c1c1f] text-center shadow-[0_30px_80px_-10px_rgb(0_0_0/0.8)] animate-pop">
        <div className="px-6 pb-5 pt-6">
          <h2 id="confirm-title" className="text-[17px] font-semibold leading-snug tracking-tight">{title}</h2>
          {message && <p id="confirm-message" className="mt-2 text-[14px] leading-relaxed text-muted">{message}</p>}
        </div>
        <div className="grid grid-cols-2 border-t border-line">
          <button
            onClick={() => onClose(false)}
            className="h-12 border-r border-line text-[16px] text-muted transition hover:bg-white/5 active:bg-white/10 cursor-pointer"
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onClose(true)}
            className={`h-12 text-[16px] font-semibold outline-none transition hover:bg-white/5 focus-visible:bg-white/5 active:bg-white/10 cursor-pointer ${
              tone === "danger" ? "text-danger" : "text-brand-light"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
