"use client";

import { useRef, useState } from "react";

/** Four PIN boxes backed by one hidden numeric input (opens the number pad on phones). */
export function PinInput({
  name,
  length = 4,
  autoFocus = false,
  label,
  autoComplete = "current-password",
  onComplete,
}: {
  name: string;
  length?: number;
  autoFocus?: boolean;
  label: string;
  autoComplete?: string;
  onComplete?: () => void;
}) {
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLInputElement>(null);

  return (
    <div className="relative" onClick={() => ref.current?.focus()}>
      <input
        ref={ref}
        name={name}
        value={value}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "").slice(0, length);
          setValue(next);
          if (next.length === length) onComplete?.();
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        pattern="[0-9]*"
        type="password"
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        aria-label={label}
        maxLength={length}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
      <div className="flex justify-between gap-3" aria-hidden>
        {Array.from({ length }).map((_, i) => {
          const filled = i < value.length;
          const active = focused && i === Math.min(value.length, length - 1);
          return (
            <div
              key={i}
              className={`grid h-16 flex-1 place-items-center rounded-2xl border bg-elevated transition-all duration-200 ${
                active ? "border-brand ring-4 ring-brand/15" : "border-line"
              }`}
            >
              <span className={`h-3.5 w-3.5 rounded-full transition-all duration-200 ${filled ? "scale-100 bg-fg" : "scale-50 bg-white/15"}`} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
