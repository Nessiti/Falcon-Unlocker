import "server-only";
import { processDueQueueEntries } from "@/lib/queue/queue-engine";
import type { CronTask, CronTaskResult } from "../types";

/**
 * Queue & Retry System (Chapter 18): processes every queue entry currently
 * due (status QUEUED, nextAttemptAt elapsed), submitting to the next
 * untried provider from its routing plan and requeuing with a delay on
 * failure — the same processing pass as the manual "Process Queue Now"
 * admin action (admin-queue.ts).
 */
export const processQueueTask: CronTask = {
  name: "process-queue",

  async run(): Promise<CronTaskResult> {
    const summary = await processDueQueueEntries();
    return {
      ok: true,
      detail: `checked ${summary.checked}, succeeded ${summary.succeeded}, requeued ${summary.requeued}, failed ${summary.failed}`,
    };
  },
};
