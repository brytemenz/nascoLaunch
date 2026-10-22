import { initials } from "@/lib/format";

export function Avatar({ name, size = "h-9 w-9 text-[13px]" }: { name: string; size?: string }) {
  return (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2c2c30] to-[#18181a] border border-line-strong font-semibold text-fg`}>
      {initials(name)}
    </span>
  );
}
