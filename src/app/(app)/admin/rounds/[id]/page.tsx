import Link from "next/link";
import { notFound } from "next/navigation";
import { RoundDetail } from "@/components/admin/RoundDetail";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RoundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exists = await db.lunchRound.findUnique({ where: { id }, select: { id: true } });
  if (!exists) notFound();
  return (
    <>
      <Link href="/admin/rounds" className="mb-6 inline-block text-sm text-muted hover:text-fg">← All rounds</Link>
      <RoundDetail roundId={id} canDelete />
    </>
  );
}
