import "server-only";
import type { CronTask } from "./types";
import { syncProvidersTask } from "./tasks/sync-providers";
import { processQueueTask } from "./tasks/process-queue";

/**
 * Every scheduled task the app runs, in registration order. To add a new
 * one: write a file under tasks/ implementing CronTask, then add it here.
 * Nothing else — the /api/cron route, the runner, and the logging all stay
 * unchanged.
 */
export const cronTasks: CronTask[] = [syncProvidersTask, processQueueTask];
