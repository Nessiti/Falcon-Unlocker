/**
 * Unified Cron System: the contract every scheduled task implements.
 * Adding a new task means writing one file under src/lib/cron/tasks/ that
 * satisfies this interface and appending it to registry.ts — nothing else
 * in the system (the /api/cron route, the runner, the logging) changes.
 */
export type CronTaskResult = { ok: true; detail?: string } | { ok: false; error: string };

export interface CronTask {
  /** Stable identifier — stored on every CronRunLog row, must be unique across the registry. */
  name: string;
  run(): Promise<CronTaskResult>;
}
