"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { runAllCronTasks, type CronRunSummary } from "@/lib/cron/runner";
import { cronTasks } from "@/lib/cron/registry";

export type CronRunLogSummary = {
  id: string;
  task: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  success: boolean;
  detail: string | null;
  error: string | null;
};

export type ListCronRunLogsResult =
  | { ok: true; logs: CronRunLogSummary[]; taskNames: string[] }
  | { ok: false; error: string };

const LIST_LIMIT = 100;

/** Unified Cron System: execution history for every task run via /api/cron or "Run Now". */
export async function listCronRunLogsAction(initData: string): Promise<ListCronRunLogsResult> {
  try {
    await requireStaff(initData);

    const logs = await prisma.cronRunLog.findMany({
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    });

    return {
      ok: true,
      taskNames: cronTasks.map((task) => task.name),
      logs: logs.map((log) => ({
        id: log.id,
        task: log.task,
        startedAt: log.startedAt.toISOString(),
        finishedAt: log.finishedAt.toISOString(),
        durationMs: log.durationMs,
        success: log.success,
        detail: log.detail,
        error: log.error,
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load cron logs";
    return { ok: false, error: message };
  }
}

export type RunCronNowResult = { ok: true; results: CronRunSummary[] } | { ok: false; error: string };

/**
 * Manual trigger for testing without waiting on the external scheduler
 * (cron-job.org) — runs the exact same registry the /api/cron route does,
 * called directly rather than over HTTP so CRON_SECRET never needs to
 * reach the browser.
 */
export async function runCronNowAction(initData: string): Promise<RunCronNowResult> {
  try {
    const admin = await requireAdmin(initData);

    const results = await runAllCronTasks();
    const summary = results.map((r) => `${r.task}=${r.success ? "ok" : "failed"}`).join(" ");
    await logAdminAction(admin.id, "cron.run-now", summary);

    return { ok: true, results };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to run cron tasks";
    return { ok: false, error: message };
  }
}
