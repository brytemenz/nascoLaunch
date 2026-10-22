import Link from "next/link";

export function Logo({ href = "/", subtitle = true, compact = false }: { href?: string; subtitle?: boolean; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5">
      <span className="relative grid h-8 w-8 place-items-center rounded-[10px] bg-gradient-to-br from-brand-light via-brand to-brand-dark shadow-[0_6px_20px_-6px_rgb(255_122_0/0.8)] transition-transform group-hover:scale-105">
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="black" strokeWidth="2.2" strokeLinecap="round">
          <path d="M7 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M9 13v8M17 3c-1.7 0-3 2.2-3 5v4h3v9" />
        </svg>
      </span>
      <span className={`text-[17px] font-semibold tracking-tight ${compact ? "sr-only" : ""}`}>
        NASCO{subtitle && <span className="text-muted font-normal"> Lunch</span>}
      </span>
    </Link>
  );
}
