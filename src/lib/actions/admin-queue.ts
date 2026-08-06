"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import {
  processQueueEntry,
  processDueQueueEntries,
  getQueueSettings,
  type ProcessOutcome,
  type ProcessQueueSummary,
} from "@/lib/queue/queue-engine";

type QueueKind = "IMEI" | "SERVER";

export type QueueEntrySummary = {
  id: string;
  kind: QueueKind;
  orderId: string;
  serviceName: string;
  customerName: string;
  status: string;
  attempts: number;
  maxRetries: number;
  nextAttemptAt: string;
  triedProviderCount: number;
  currentProviderName: string | null;
  providerOrderId: string | null;
  lastError: string | null;
  createdAt: string;
};

const LIST_LIMIT = 200;

async function buildSummaries(
  entries: Awaited<ReturnType<typeof loadEntries>>,
): Promise<QueueEntrySummary[]> {
  const imeiIds = entries.filter((e) => e.kind === "IMEI").map((e) => e.orderId);
  const serverIds = entries.filter((e) => e.kind === "SERVER").map((e) => e.orderId);

  const [imeiOrders, serverOrders] = await Promise.all([
    prisma.imeiOrder.findMany({ where: { id: { in: imeiIds } }, include: { service: true, user: true } }),
    prisma.serverOrder.findMany({ where: { id: { in: serverIds } }, include: { service: true, user: true } }),
  ]);
  const imeiById = new Map(imeiOrders.map((o) => [o.id, o]));
  const serverById = new Map(serverOrders.map((o) => [o.id, o]));

  return entries.map((entry) => {
    const order = entry.kind === "IMEI" ? imeiById.get(entry.orderId) : serverById.get(entry.orderId);
    return {
      id: entry.id,
      kind: entry.kind as QueueKind,
      orderId: entry.orderId,
      serviceName: order?.service.name ?? "(order not found)",
      customerName: order ? [order.user.firstName, order.user.lastName].filter(Boolean).join(" ") : "—",
      status: entry.status,
      attempts: entry.attempts,
      maxRetries: entry.maxRetries,
      nextAttemptAt: entry.nextAttemptAt.toISOString(),
      triedProviderCount: entry.triedProviderIds.length,
      currentProviderName: entry.currentProvider?.name ?? null,
      providerOrderId: entry.providerOrderId,
      lastError: entry.lastError,
      createdAt: entry.createdAt.toISOString(),
    };
  });
}

function loadEntries() {
  return prisma.orderQueueEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: LIST_LIMIT,
    include: { currentProvider: true },
  });
}

export type ListQueueEntriesResult =
  | { ok: true; entries: QueueEntrySummary[] }
  | { ok: false; error: string };

/** Queue & Retry System (Chapter 18): every order queued for automatic provider submission. */
export async function listQueueEntriesAction(initData: string): Promise<ListQueueEntriesResult> {
  try {
    await requireStaff(initData);
    const entries = await buildSummaries(await loadEntries());
    return { ok: true, entries };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load queue";
    return { ok: false, error: message };
  }
}

export type QueueAttemptLogSummary = {
  id: string;
  providerName: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export type QueueEntryDetail = QueueEntrySummary & { attemptLogs: QueueAttemptLogSummary[] };

export type GetQueueEntryDetailResult =
  | { ok: true; entry: QueueEntryDetail }
  | { ok: false; error: string };

/** The retry history for one queue entry — every provider attempted, in order. */
export async function getQueueEntryDetailAction(
  initData: string,
  queueEntryId: string,
): Promise<GetQueueEntryDetailResult> {
  try {
    await requireStaff(initData);

    const entry = await prisma.orderQueueEntry.findUnique({
      where: { id: queueEntryId },
      include: {
        currentProvider: true,
        attemptLogs: { include: { provider: true }, orderBy: { createdAt: "asc" } },
      },
    });
    if (!entry) return { ok: false, error: "Queue entry not found" };

    const [summary] = await buildSummaries([entry]);
    return {
      ok: true,
      entry: {
        ...summary,
        attemptLogs: entry.attemptLogs.map((log) => ({
          id: log.id,
          providerName: log.provider.name,
          success: log.success,
          errorMessage: log.errorMessage,
          createdAt: log.createdAt.toISOString(),
        })),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load queue entry";
    return { ok: false, error: message };
  }
}

export type CancelQueueEntryResult = { ok: true } | { ok: false; error: string };

/** Cancel Queue (Chapter 18): stops all future automatic attempts for this order. */
export async function cancelQueueEntryAction(
  initData: string,
  queueEntryId: string,
): Promise<CancelQueueEntryResult> {
  try {
    const admin = await requireAdmin(initData);

    const entry = await prisma.orderQueueEntry.findUnique({ where: { id: queueEntryId } });
    if (!entry) return { ok: false, error: "Queue entry not found" };
    if (entry.status === "SUCCEEDED" || entry.status === "CANCELLED") {
      return { ok: false, error: "This entry is already finished" };
    }

    await prisma.orderQueueEntry.update({ where: { id: queueEntryId }, data: { status: "CANCELLED" } });
    await logAdminAction(admin.id, "queue.cancel", `${entry.kind} ${entry.orderId}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to cancel queue entry";
    return { ok: false, error: message };
  }
}

export type RetryQueueEntryResult =
  | { ok: true; outcome: ProcessOutcome }
  | { ok: false; error: string };

/**
 * Manual Retry (Chapter 18): gives a failed or cancelled entry a fresh pass
 * through every mapped provider again (clears triedProviderIds/attempts —
 * circumstances may have changed since the last failure) and processes it
 * immediately rather than waiting for the next cron tick.
 */
export async function retryQueueEntryAction(
  initData: string,
  queueEntryId: string,
): Promise<RetryQueueEntryResult> {
  try {
    const admin = await requireAdmin(initData);

    const entry = await prisma.orderQueueEntry.findUnique({ where: { id: queueEntryId } });
    if (!entry) return { ok: false, error: "Queue entry not found" };
    if (entry.status !== "FAILED" && entry.status !== "CANCELLED") {
      return { ok: false, error: "Only failed or cancelled entries can be retried" };
    }

    await prisma.orderQueueEntry.update({
      where: { id: queueEntryId },
      data: { status: "QUEUED", attempts: 0, triedProviderIds: [], lastError: null, nextAttemptAt: new Date() },
    });
    await logAdminAction(admin.id, "queue.retry", `${entry.kind} ${entry.orderId}`);

    const outcome = await processQueueEntry(queueEntryId);
    return { ok: true, outcome };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to retry queue entry";
    return { ok: false, error: message };
  }
}

export type ProcessQueueNowResult =
  | { ok: true; summary: ProcessQueueSummary }
  | { ok: false; error: string };

/** Manual trigger for the same processing pass the process-queue cron task runs via /api/cron. */
export async function processQueueNowAction(initData: string): Promise<ProcessQueueNowResult> {
  try {
    const admin = await requireAdmin(initData);
    const summary = await processDueQueueEntries();
    await logAdminAction(
      admin.id,
      "queue.process-now",
      `checked ${summary.checked} · succeeded ${summary.succeeded} · failed ${summary.failed} · requeued ${summary.requeued}`,
    );
    return { ok: true, summary };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to process queue";
    return { ok: false, error: message };
  }
}

export type QueueSettingsData = { maxRetries: number; retryDelaySeconds: number };

export type GetQueueSettingsResult =
  | { ok: true; settings: QueueSettingsData }
  | { ok: false; error: string };

/** Retry configuration (Chapter 18): defaults copied onto every new queue entry at creation time. */
export async function getQueueSettingsAction(initData: string): Promise<GetQueueSettingsResult> {
  try {
    await requireStaff(initData);
    const settings = await getQueueSettings();
    return {
      ok: true,
      settings: { maxRetries: settings.maxRetries, retryDelaySeconds: settings.retryDelaySeconds },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load queue settings";
    return { ok: false, error: message };
  }
}

export type UpdateQueueSettingsResult = { ok: true } | { ok: false; error: string };

/** Only affects entries created after this change — in-flight entries keep the budget they were queued with. */
export async function updateQueueSettingsAction(
  initData: string,
  input: QueueSettingsData,
): Promise<UpdateQueueSettingsResult> {
  try {
    const admin = await requireAdmin(initData);

    if (!Number.isInteger(input.maxRetries) || input.maxRetries < 0) {
      return { ok: false, error: "Maximum retries must be a non-negative whole number" };
    }
    if (!Number.isInteger(input.retryDelaySeconds) || input.retryDelaySeconds < 0) {
      return { ok: false, error: "Retry delay must be a non-negative whole number of seconds" };
    }

    await prisma.queueSettings.upsert({
      where: { id: "singleton" },
      update: { maxRetries: input.maxRetries, retryDelaySeconds: input.retryDelaySeconds },
      create: { id: "singleton", maxRetries: input.maxRetries, retryDelaySeconds: input.retryDelaySeconds },
    });
    await logAdminAction(
      admin.id,
      "queue.settings",
      `maxRetries=${input.maxRetries} retryDelaySeconds=${input.retryDelaySeconds}`,
    );
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update queue settings";
    return { ok: false, error: message };
  }
}
