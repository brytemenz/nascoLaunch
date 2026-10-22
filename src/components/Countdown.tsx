"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function parts(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** Live countdown to the cut-off. Refreshes the page when it hits zero so the round closes. */
export function Countdown({ to, compact = false }: { to: string; compact?: boolean }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = now === null ? null : target - now;
  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      const t = setTimeout(() => router.refresh(), 1500);
      return () => clearTimeout(t);
    }
  }, [remaining, router]);

  if (remaining === null) return <span className="tabular-nums opacity-0">00:00:00</span>;
  if (remaining <= 0) return <span>Closing…</span>;

  const { h, m, s } = parts(remaining);
  const pad = (n: number) => String(n).padStart(2, "0");
  if (compact) return <span className="tabular-nums">{h > 0 ? `${h}h ${pad(m)}m` : `${m}m ${pad(s)}s`}</span>;

  return (
    <span className="flex items-baseline gap-1 tabular-nums">
      {[
        [h, "h"],
        [m, "m"],
        [s, "s"],
      ].map(([v, u]) => (
        <span key={u as string} className="flex items-baseline">
          <span className="text-3xl sm:text-4xl font-semibold tracking-tight">{pad(v as number)}</span>
          <span className="ml-0.5 mr-2 text-sm text-muted">{u}</span>
        </span>
      ))}
    </span>
  );
}
