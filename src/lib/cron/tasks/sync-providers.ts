import "server-only";
import { prisma } from "@/lib/prisma";
import { syncProvider, isSyncDue } from "@/lib/providers/sync-engine";
import type { CronTask, CronTaskResult } from "../types";

/**
 * Automatic Synchronization (Chapter 16): syncs every enabled provider
 * whose configured frequency (HOURLY / EVERY_6_HOURS / DAILY) has elapsed
 * since its last sync. Self-gating on isSyncDue means this task is safe to
 * run as often as the scheduler calls /api/cron - providers not due yet
 * are simply skipped, no matter how frequently this fires.
 */
export const syncProvidersTask: CronTask = {
  name: "sync-providers",

  async run(): Promise<CronTaskResult> {
    const providers = await prisma.provider.findMany({
      where: { enabled: true, syncFrequency: { not: "MANUAL" } },
    });
    const due = providers.filter((provider) => isSyncDue(provider.syncFrequency, provider.lastSyncAt));

    let succeeded = 0;
    const failures: string[] = [];

    for (const provider of due) {
      try {
        await syncProvider(provider);
        succeeded += 1;
      } catch (error) {
        failures.push(`${provider.name}: ${error instanceof Error ? error.message : "sync failed"}`);
      }
    }

    const detail = `checked ${providers.length}, due ${due.length}, synced ${succeeded}`;
    if (failures.length > 0) {
      return { ok: false, error: `${detail} - failures: ${failures.join("; ")}` };
    }
    return { ok: true, detail };
  },
};
