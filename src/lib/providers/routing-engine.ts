import "server-only";
import { prisma } from "@/lib/prisma";
import type { RoutingStrategy } from "@/generated/prisma/client";

/**
 * Smart Routing Engine (Chapter 15): given a service's enabled provider
 * mappings, decides which provider to try first and, for every strategy
 * except MANUAL, the automatic fallback order - "if Provider A fails, retry
 * B, then C, without user intervention." MANUAL disables fallback: only the
 * top-priority mapping is returned, since the admin wants to control
 * provider choice by hand rather than have the engine pick for them.
 */

export type RoutingCandidate = {
  mappingId: string;
  providerId: string;
  providerName: string;
  providerServiceId: string;
  providerServiceName: string | null;
  priceCents: number | null;
  priority: number;
  successRate: number | null;
  avgResponseMs: number | null;
};

type MappingForRouting = {
  id: string;
  providerId: string;
  providerServiceId: string;
  providerServiceName: string | null;
  providerPriceCents: number | null;
  priority: number;
  provider: { name: string; enabled: boolean };
};

/** Success rate and average response time from a provider's recent connection history. */
async function computeProviderStats(
  providerIds: string[],
): Promise<Map<string, { successRate: number | null; avgResponseMs: number | null }>> {
  const stats = new Map<string, { successRate: number | null; avgResponseMs: number | null }>();
  if (providerIds.length === 0) return stats;

  const SAMPLE_SIZE = 20;
  for (const providerId of providerIds) {
    const logs = await prisma.providerConnectionLog.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: SAMPLE_SIZE,
      select: { success: true, responseTimeMs: true },
    });

    if (logs.length === 0) {
      stats.set(providerId, { successRate: null, avgResponseMs: null });
      continue;
    }

    const successCount = logs.filter((log) => log.success).length;
    const timings = logs.filter((log) => log.responseTimeMs != null).map((log) => log.responseTimeMs!);
    const avgResponseMs =
      timings.length > 0 ? Math.round(timings.reduce((sum, ms) => sum + ms, 0) / timings.length) : null;

    stats.set(providerId, { successRate: successCount / logs.length, avgResponseMs });
  }

  return stats;
}

function rankCandidates(
  candidates: RoutingCandidate[],
  strategy: RoutingStrategy,
): { order: RoutingCandidate[]; fallbackEnabled: boolean } {
  const byPriority = [...candidates].sort((a, b) => a.priority - b.priority);

  if (strategy === "MANUAL") {
    return { order: byPriority.slice(0, 1), fallbackEnabled: false };
  }

  if (strategy === "PREFERRED") {
    return { order: byPriority, fallbackEnabled: true };
  }

  if (strategy === "CHEAPEST") {
    const sorted = [...candidates].sort((a, b) => {
      if (a.priceCents == null && b.priceCents == null) return a.priority - b.priority;
      if (a.priceCents == null) return 1;
      if (b.priceCents == null) return -1;
      return a.priceCents - b.priceCents || a.priority - b.priority;
    });
    return { order: sorted, fallbackEnabled: true };
  }

  if (strategy === "FASTEST") {
    const sorted = [...candidates].sort((a, b) => {
      if (a.avgResponseMs == null && b.avgResponseMs == null) return a.priority - b.priority;
      if (a.avgResponseMs == null) return 1;
      if (b.avgResponseMs == null) return -1;
      return a.avgResponseMs - b.avgResponseMs || a.priority - b.priority;
    });
    return { order: sorted, fallbackEnabled: true };
  }

  // HIGHEST_SUCCESS_RATE
  const sorted = [...candidates].sort((a, b) => {
    if (a.successRate == null && b.successRate == null) return a.priority - b.priority;
    if (a.successRate == null) return 1;
    if (b.successRate == null) return -1;
    return b.successRate - a.successRate || a.priority - b.priority;
  });
  return { order: sorted, fallbackEnabled: true };
}

export type RoutingPlan = {
  strategy: RoutingStrategy;
  fallbackEnabled: boolean;
  order: RoutingCandidate[];
};

/**
 * Builds the routing plan for a Falcon service: the ordered list of
 * candidate providers (per the service's configured strategy) that an order
 * would be tried against, in order, with automatic fallback to the next
 * candidate on failure (except under MANUAL).
 */
export async function buildRoutingPlan(
  strategy: RoutingStrategy,
  mappings: MappingForRouting[],
): Promise<RoutingPlan> {
  const eligible = mappings.filter((mapping) => mapping.provider.enabled);
  const stats = await computeProviderStats([...new Set(eligible.map((m) => m.providerId))]);

  const candidates: RoutingCandidate[] = eligible.map((mapping) => ({
    mappingId: mapping.id,
    providerId: mapping.providerId,
    providerName: mapping.provider.name,
    providerServiceId: mapping.providerServiceId,
    providerServiceName: mapping.providerServiceName,
    priceCents: mapping.providerPriceCents,
    priority: mapping.priority,
    successRate: stats.get(mapping.providerId)?.successRate ?? null,
    avgResponseMs: stats.get(mapping.providerId)?.avgResponseMs ?? null,
  }));

  const { order, fallbackEnabled } = rankCandidates(candidates, strategy);
  return { strategy, fallbackEnabled, order };
}
