import "server-only";
import { prisma } from "@/lib/prisma";
import { getProviderConnector } from "@/lib/providers/registry";
import { buildRoutingPlan } from "@/lib/providers/routing-engine";
import { notifyOrderStatusChanged } from "@/lib/telegram/notifications";
import { OrderStatus } from "@/generated/prisma/client";

/**
 * Queue & Retry System (Chapter 18): Order -> Queue -> Provider -> Response.
 * Reuses the Chapter 15 routing plan to pick a candidate provider and, on
 * failure, automatically retries the next candidate — unless the service's
 * strategy is MANUAL (no automatic fallback, per the routing engine) or the
 * retry budget (QueueSettings.maxRetries) is exhausted.
 */

export type QueueKind = "IMEI" | "SERVER";

/** Loads the singleton QueueSettings row, creating it with defaults on first access. */
export async function getQueueSettings() {
  return prisma.queueSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

/**
 * Called right after an order is created. Only enqueues when the ordered
 * service has at least one enabled mapping to an enabled provider — services
 * with no routing configured stay fully manual, unchanged from before this
 * chapter. Idempotent: the unique(kind, orderId) constraint means calling
 * this twice for the same order is a safe no-op, never a duplicate entry.
 */
export async function enqueueOrder(kind: QueueKind, orderId: string): Promise<void> {
  const routable =
    kind === "IMEI"
      ? await prisma.imeiOrder.findFirst({
          where: {
            id: orderId,
            service: { mappings: { some: { enabled: true, provider: { enabled: true } } } },
          },
          select: { id: true },
        })
      : await prisma.serverOrder.findFirst({
          where: {
            id: orderId,
            service: { mappings: { some: { enabled: true, provider: { enabled: true } } } },
          },
          select: { id: true },
        });

  if (!routable) return;

  const settings = await getQueueSettings();

  try {
    await prisma.orderQueueEntry.create({
      data: {
        kind,
        orderId,
        maxRetries: settings.maxRetries,
        retryDelaySeconds: settings.retryDelaySeconds,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("Unique constraint")) return;
    throw error;
  }
}

async function advanceOrderToProcessing(kind: QueueKind, orderId: string): Promise<void> {
  if (kind === "IMEI") {
    const order = await prisma.imeiOrder.findUnique({
      where: { id: orderId },
      include: { user: true, service: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;
    await prisma.$transaction([
      prisma.imeiOrder.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } }),
      prisma.imeiOrderStatusEvent.create({
        data: {
          orderId,
          status: OrderStatus.PROCESSING,
          comment: "Automatically submitted to provider (Queue & Retry System)",
        },
      }),
    ]);
    await notifyOrderStatusChanged(order.user.telegramId, order.service.name, OrderStatus.PROCESSING);
  } else {
    const order = await prisma.serverOrder.findUnique({
      where: { id: orderId },
      include: { user: true, service: true },
    });
    if (!order || order.status !== OrderStatus.PENDING) return;
    await prisma.$transaction([
      prisma.serverOrder.update({ where: { id: orderId }, data: { status: OrderStatus.PROCESSING } }),
      prisma.serverOrderStatusEvent.create({
        data: {
          orderId,
          status: OrderStatus.PROCESSING,
          comment: "Automatically submitted to provider (Queue & Retry System)",
        },
      }),
    ]);
    await notifyOrderStatusChanged(order.user.telegramId, order.service.name, OrderStatus.PROCESSING);
  }
}

async function failEntry(id: string, message: string): Promise<void> {
  await prisma.orderQueueEntry.update({
    where: { id },
    data: { status: "FAILED", lastError: message },
  });
}

export type ProcessOutcome = "SUCCEEDED" | "FAILED" | "REQUEUED" | null;

/**
 * Claims and processes exactly one queue entry. Returns null if it couldn't
 * be claimed (already picked up by a concurrent run, or no longer QUEUED) —
 * the atomic claim is what prevents the same entry from ever being
 * submitted to a provider twice.
 */
export async function processQueueEntry(queueEntryId: string): Promise<ProcessOutcome> {
  const claim = await prisma.orderQueueEntry.updateMany({
    where: { id: queueEntryId, status: "QUEUED" },
    data: { status: "PROCESSING" },
  });
  if (claim.count === 0) return null;

  const entry = await prisma.orderQueueEntry.findUniqueOrThrow({ where: { id: queueEntryId } });

  try {
    const order =
      entry.kind === "IMEI"
        ? await prisma.imeiOrder.findUnique({
            where: { id: entry.orderId },
            include: {
              service: {
                include: { mappings: { where: { enabled: true }, include: { provider: true } } },
              },
            },
          })
        : await prisma.serverOrder.findUnique({
            where: { id: entry.orderId },
            include: {
              service: {
                include: { mappings: { where: { enabled: true }, include: { provider: true } } },
              },
            },
          });

    if (!order) {
      await failEntry(entry.id, "Order no longer exists");
      return "FAILED";
    }

    const plan = await buildRoutingPlan(order.service.routingStrategy, order.service.mappings);
    const candidate = plan.order.find((c) => !entry.triedProviderIds.includes(c.providerId));

    if (!candidate) {
      await failEntry(entry.id, "No more providers to try — every mapped provider has already failed");
      return "FAILED";
    }

    const mapping = order.service.mappings.find((m) => m.providerId === candidate.providerId);
    if (!mapping) {
      await failEntry(entry.id, "Mapped provider is no longer available");
      return "FAILED";
    }

    const connector = getProviderConnector(mapping.provider);
    // fieldValues was captured as Record<string, string> at order-creation time (CreateImeiOrderInput/CreateServerOrderInput).
    const result = await connector.submitOrder({
      providerServiceId: candidate.providerServiceId,
      fieldValues: order.fieldValues as Record<string, string>,
      kind: entry.kind as QueueKind,
    });

    await prisma.queueAttemptLog.create({
      data: {
        queueEntryId: entry.id,
        providerId: candidate.providerId,
        success: result.ok,
        errorMessage: result.ok ? null : result.error,
      },
    });

    const attempts = entry.attempts + 1;
    const triedProviderIds = [...entry.triedProviderIds, candidate.providerId];

    if (result.ok) {
      await prisma.orderQueueEntry.update({
        where: { id: entry.id },
        data: {
          status: "SUCCEEDED",
          attempts,
          triedProviderIds,
          currentProviderId: candidate.providerId,
          providerOrderId: result.providerOrderId,
          lastError: null,
        },
      });
      await advanceOrderToProcessing(entry.kind as QueueKind, entry.orderId);
      return "SUCCEEDED";
    }

    const candidatesRemain = plan.order.some((c) => !triedProviderIds.includes(c.providerId));
    const canRetry = plan.fallbackEnabled && candidatesRemain && attempts < entry.maxRetries;

    if (canRetry) {
      await prisma.orderQueueEntry.update({
        where: { id: entry.id },
        data: {
          status: "QUEUED",
          attempts,
          triedProviderIds,
          lastError: result.error,
          nextAttemptAt: new Date(Date.now() + entry.retryDelaySeconds * 1000),
        },
      });
      return "REQUEUED";
    }

    await prisma.orderQueueEntry.update({
      where: { id: entry.id },
      data: { status: "FAILED", attempts, triedProviderIds, lastError: result.error },
    });
    return "FAILED";
  } catch (error) {
    await failEntry(entry.id, error instanceof Error ? error.message : "Unexpected error");
    return "FAILED";
  }
}

export type ProcessQueueSummary = {
  checked: number;
  succeeded: number;
  failed: number;
  requeued: number;
};

const BATCH_LIMIT = 20;

/** Processes every entry currently due (status QUEUED, nextAttemptAt <= now), up to BATCH_LIMIT per run. */
export async function processDueQueueEntries(): Promise<ProcessQueueSummary> {
  const due = await prisma.orderQueueEntry.findMany({
    where: { status: "QUEUED", nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: BATCH_LIMIT,
    select: { id: true },
  });

  const summary: ProcessQueueSummary = { checked: due.length, succeeded: 0, failed: 0, requeued: 0 };
  for (const { id } of due) {
    const outcome = await processQueueEntry(id);
    if (outcome === "SUCCEEDED") summary.succeeded += 1;
    else if (outcome === "FAILED") summary.failed += 1;
    else if (outcome === "REQUEUED") summary.requeued += 1;
  }
  return summary;
}
