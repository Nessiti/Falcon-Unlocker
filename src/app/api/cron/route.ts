import { NextResponse, type NextRequest } from "next/server";
import { runAllCronTasks } from "@/lib/cron/runner";

/**
 * Unified Cron System: the single entry point for every scheduled task,
 * meant to be called by an external scheduler (cron-job.org) instead of a
 * hosting provider's native cron - Vercel's Hobby plan only allows daily
 * cron jobs, which isn't frequent enough for queue processing. Contains no
 * business logic itself: authenticates the request, then hands off to
 * runAllCronTasks(), which runs every task registered in
 * src/lib/cron/registry.ts independently and logs each one to CronRunLog.
 */
async function handleCronRequest(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllCronTasks();
  return NextResponse.json({ ok: true, results });
}

export const GET = handleCronRequest;
export const POST = handleCronRequest;
