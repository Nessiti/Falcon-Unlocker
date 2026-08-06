"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { isSyncDue } from "@/lib/providers/sync-engine";

/**
 * Monitoring Dashboard (Chapter 20): a real-time Provider Monitoring
 * Center, built entirely from data earlier chapters already collect —
 * ApiLog (Chapter 17) for status/success rate/response time, OrderQueueEntry
 * and QueueAttemptLog (Chapter 18) for active/daily orders, and Provider's
 * own balance/sync fields (Chapters 12, 16). "Real-time" here means
 * polled — the admin UI refreshes this on an interval, the same pattern as
 * the live admin alerts feature.
 */

export type ProviderMonitoring = {
  id: string;
  name: string;
  enabled: boolean;
  /** Whether the most recent API call to this provider succeeded. Null = no calls logged yet. */
  online: boolean | null;
  /** 0-1, over the last 24h. Null = no calls in the window. */
  successRate: number | null;
  totalRequests: number;
  failedRequests: number;
  avgResponseTimeMs: number | null;
  activeOrders: number;
  dailyOrders: number;
  balanceCents: number | null;
  balanceAt: string | null;
  syncFrequency: string;
  lastSyncAt: string | null;
  syncDue: boolean;
};

export type MonitoringTotals = {
  activeOrders: number;
  dailyOrders: number;
  avgSuccessRate: number | null;
  onlineCount: number;
  providerCount: number;
};

export type MonitoringOverview = {
  providers: ProviderMonitoring[];
  totals: MonitoringTotals;
};

export type GetMonitoringOverviewResult =
  | { ok: true; overview: MonitoringOverview }
  | { ok: false; error: string };

const WINDOW_MS = 24 * 60 * 60 * 1000;

export async function getMonitoringOverviewAction(initData: string): Promise<GetMonitoringOverviewResult> {
  try {
    await requireStaff(initData);

    const providers = await prisma.provider.findMany({ orderBy: { priority: "asc" } });
    const since = new Date(Date.now() - WINDOW_MS);
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const results: ProviderMonitoring[] = await Promise.all(
      providers.map(async (provider) => {
        const [logs, activeOrders, dailyOrders, latestLog] = await Promise.all([
          prisma.apiLog.findMany({
            where: { providerId: provider.id, createdAt: { gte: since } },
            select: { success: true, responseTimeMs: true },
          }),
          prisma.orderQueueEntry.count({
            where: { currentProviderId: provider.id, status: { in: ["QUEUED", "PROCESSING"] } },
          }),
          prisma.queueAttemptLog.count({
            where: { providerId: provider.id, success: true, createdAt: { gte: startOfToday } },
          }),
          prisma.apiLog.findFirst({
            where: { providerId: provider.id },
            orderBy: { createdAt: "desc" },
            select: { success: true },
          }),
        ]);

        const totalRequests = logs.length;
        const failedRequests = logs.filter((log) => !log.success).length;
        const successRate = totalRequests > 0 ? (totalRequests - failedRequests) / totalRequests : null;
        const timings = logs
          .map((log) => log.responseTimeMs)
          .filter((ms): ms is number => ms != null);
        const avgResponseTimeMs =
          timings.length > 0
            ? Math.round(timings.reduce((sum, ms) => sum + ms, 0) / timings.length)
            : null;

        return {
          id: provider.id,
          name: provider.name,
          enabled: provider.enabled,
          online: latestLog?.success ?? null,
          successRate,
          totalRequests,
          failedRequests,
          avgResponseTimeMs,
          activeOrders,
          dailyOrders,
          balanceCents: provider.lastBalanceCents,
          balanceAt: provider.lastBalanceAt?.toISOString() ?? null,
          syncFrequency: provider.syncFrequency,
          lastSyncAt: provider.lastSyncAt?.toISOString() ?? null,
          syncDue: isSyncDue(provider.syncFrequency, provider.lastSyncAt),
        };
      }),
    );

    const withRate = results.filter((provider) => provider.successRate != null);
    const totals: MonitoringTotals = {
      activeOrders: results.reduce((sum, provider) => sum + provider.activeOrders, 0),
      dailyOrders: results.reduce((sum, provider) => sum + provider.dailyOrders, 0),
      avgSuccessRate:
        withRate.length > 0
          ? withRate.reduce((sum, provider) => sum + (provider.successRate ?? 0), 0) / withRate.length
          : null,
      onlineCount: results.filter((provider) => provider.online === true).length,
      providerCount: results.length,
    };

    return { ok: true, overview: { providers: results, totals } };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load monitoring data";
    return { ok: false, error: message };
  }
}
