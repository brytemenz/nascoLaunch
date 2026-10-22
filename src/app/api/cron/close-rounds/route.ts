import { NextResponse, type NextRequest } from "next/server";
import { autoCloseDueRounds } from "@/lib/rounds";

export const dynamic = "force-dynamic";

/**
 * Closes rounds whose cut-off has passed and sends them to the restaurant.
 * Call every few minutes from a scheduler (Vercel Cron, cron-job.org, etc.):
 *   GET /api/cron/close-rounds   with header  Authorization: Bearer <CRON_SECRET>
 * Rounds also close automatically whenever someone opens the app after the cut-off.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const closed = await autoCloseDueRounds();
  return NextResponse.json({ closed });
}
