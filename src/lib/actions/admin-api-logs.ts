"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { getProviderConnector } from "@/lib/providers/registry";
import type { ApiLogOperation } from "@/lib/providers/types";
import { Prisma } from "@/generated/prisma/client";

export type ApiLogFilters = {
  providerId?: string;
  operation?: string;
  success?: boolean;
  search?: string;
};

function buildWhere(filters: ApiLogFilters): Prisma.ApiLogWhereInput {
  const where: Prisma.ApiLogWhereInput = {};
  if (filters.providerId) where.providerId = filters.providerId;
  if (filters.operation) where.operation = filters.operation;
  if (filters.success != null) where.success = filters.success;

  const term = filters.search?.trim();
  if (term) {
    where.OR = [
      { endpoint: { contains: term, mode: "insensitive" } },
      { errorMessage: { contains: term, mode: "insensitive" } },
    ];
  }
  return where;
}

export type ApiLogSummary = {
  id: string;
  providerId: string;
  providerName: string;
  operation: string;
  endpoint: string;
  method: string;
  statusCode: number | null;
  responseTimeMs: number;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
};

export type ListApiLogsResult = { ok: true; logs: ApiLogSummary[] } | { ok: false; error: string };

const LIST_LIMIT = 100;

/** API Logs (Chapter 17): browse the log every connector call writes via base-connector.ts's fetchWithTimeout. */
export async function listApiLogsAction(
  initData: string,
  filters: ApiLogFilters,
): Promise<ListApiLogsResult> {
  try {
    await requireStaff(initData);

    const logs = await prisma.apiLog.findMany({
      where: buildWhere(filters),
      include: { provider: true },
      orderBy: { createdAt: "desc" },
      take: LIST_LIMIT,
    });

    return {
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        providerId: log.providerId,
        providerName: log.provider.name,
        operation: log.operation,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTimeMs: log.responseTimeMs,
        success: log.success,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load API logs";
    return { ok: false, error: message };
  }
}

export type ApiLogDetail = ApiLogSummary & { requestBody: string | null; responseBody: string | null };

export type GetApiLogDetailResult = { ok: true; log: ApiLogDetail } | { ok: false; error: string };

/** Full request/response bodies, fetched on demand (kept out of the list to stay light). */
export async function getApiLogDetailAction(
  initData: string,
  logId: string,
): Promise<GetApiLogDetailResult> {
  try {
    await requireStaff(initData);

    const log = await prisma.apiLog.findUnique({ where: { id: logId }, include: { provider: true } });
    if (!log) return { ok: false, error: "Log not found" };

    return {
      ok: true,
      log: {
        id: log.id,
        providerId: log.providerId,
        providerName: log.provider.name,
        operation: log.operation,
        endpoint: log.endpoint,
        method: log.method,
        statusCode: log.statusCode,
        responseTimeMs: log.responseTimeMs,
        success: log.success,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
        requestBody: log.requestBody,
        responseBody: log.responseBody,
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load log";
    return { ok: false, error: message };
  }
}

export type ExportApiLogsResult = { ok: true; csv: string } | { ok: false; error: string };

function csvField(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

const EXPORT_LIMIT = 1000;

/** Export (Chapter 17): CSV of the filtered logs, downloaded client-side as a file. */
export async function exportApiLogsAction(
  initData: string,
  filters: ApiLogFilters,
): Promise<ExportApiLogsResult> {
  try {
    await requireStaff(initData);

    const logs = await prisma.apiLog.findMany({
      where: buildWhere(filters),
      include: { provider: true },
      orderBy: { createdAt: "desc" },
      take: EXPORT_LIMIT,
    });

    const header = [
      "Date",
      "Provider",
      "Operation",
      "Method",
      "Endpoint",
      "Status Code",
      "Response Time (ms)",
      "Success",
      "Error Message",
    ];
    const rows = logs.map((log) => [
      log.createdAt.toISOString(),
      log.provider.name,
      log.operation,
      log.method,
      log.endpoint,
      log.statusCode?.toString() ?? "",
      log.responseTimeMs.toString(),
      log.success ? "true" : "false",
      log.errorMessage ?? "",
    ]);

    const csv = [header, ...rows].map((row) => row.map(csvField).join(",")).join("\n");
    return { ok: true, csv };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to export logs";
    return { ok: false, error: message };
  }
}

export type RetryApiLogResult = { ok: true } | { ok: false; error: string };

const RETRYABLE_OPERATIONS = new Set<ApiLogOperation>(["testConnection", "getBalance", "getServices"]);

/**
 * Retry Request (Chapter 17): re-invokes the same connector method rather
 * than raw-replaying the stored request bytes, which never include
 * credentials and would go stale immediately if secrets rotate. Scoped to
 * parameterless, idempotent operations only — retrying submitOrder blindly
 * risks a duplicate real order on the provider side, which is the Queue &
 * Retry System's job (Chapter 18), not this one.
 */
export async function retryApiLogAction(initData: string, logId: string): Promise<RetryApiLogResult> {
  try {
    const admin = await requireAdmin(initData);

    const log = await prisma.apiLog.findUnique({ where: { id: logId }, include: { provider: true } });
    if (!log) return { ok: false, error: "Log not found" };
    if (!RETRYABLE_OPERATIONS.has(log.operation as ApiLogOperation)) {
      return {
        ok: false,
        error: "This operation can't be safely retried automatically (order operations are Chapter 18's job)",
      };
    }

    const connector = getProviderConnector(log.provider);
    if (log.operation === "testConnection") await connector.testConnection();
    else if (log.operation === "getBalance") await connector.getBalance();
    else await connector.getServices();

    await logAdminAction(admin.id, "api-log.retry", `${log.provider.name} -> ${log.operation}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to retry request";
    return { ok: false, error: message };
  }
}
