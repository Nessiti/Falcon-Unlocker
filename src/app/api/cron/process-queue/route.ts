import { NextResponse, type NextRequest } from "next/server";
import { processDueQueueEntries } from "@/lib/queue/queue-engine";

/**
 * Queue & Retry System (Chapter 18). Invoked by Vercel Cron (see
 * vercel.json) — processes every queue entry currently due (status QUEUED,
 * nextAttemptAt elapsed), submitting to the next untried provider from its
 * routing plan and requeuing with a delay on failure, same as the manual
 * "Process Queue Now" admin action (admin-queue.ts).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary = await processDueQueueEntries();
  return NextResponse.json({ ok: true, ...summary });
}
