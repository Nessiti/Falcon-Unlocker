import "server-only";
import { prisma } from "@/lib/prisma";
import { cronTasks } from "./registry";
import type { CronTask } from "./types";

export type CronRunSummary = {
  task: string;
  success: boolean;
  durationMs: number;
  detail: string | null;
  error: string | null;
};

async function runTask(task: CronTask): Promise<CronRunSummary> {
  const startedAt = new Date();
  let success = false;
  let detail: string | null = null;
  let error: string | null = null;

  try {
    const result = await task.run();
    success = result.ok;
    if (result.ok) detail = result.detail ?? null;
    else error = result.error;
  } catch (err) {
    success = false;
    error = err instanceof Error ? err.message : "Unexpected error";
  }

  const finishedAt = new Date();
  const durationMs = finishedAt.getTime() - startedAt.getTime();

  try {
    await prisma.cronRunLog.create({
      data: { task: task.name, startedAt, finishedAt, durationMs, success, detail, error },
    });
  } catch (logError) {
    console.error(`Failed to write CronRunLog for task "${task.name}"`, logError);
  }

  return { task: task.name, success, durationMs, detail, error };
}

/**
 * Runs every registered task independently — Promise.allSettled means a
 * task that throws (or even a bug in runTask's own error handling) never
 * stops the others from running. This is what /api/cron calls; it contains
 * no task-specific logic itself.
 */
export async function runAllCronTasks(): Promise<CronRunSummary[]> {
  const settled = await Promise.allSettled(cronTasks.map(runTask));

  return settled.map((outcome, index) =>
    outcome.status === "fulfilled"
      ? outcome.value
      : {
          task: cronTasks[index].name,
          success: false,
          durationMs: 0,
          detail: null,
          error: outcome.reason instanceof Error ? outcome.reason.message : "Task runner crashed",
        },
  );
}
