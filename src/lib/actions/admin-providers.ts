"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { ProviderType } from "@/generated/prisma/client";

function maskSecret(value: string | null): string | null {
  if (!value) return null;
  if (value.length <= 4) return "••••";
  return `••••${value.slice(-4)}`;
}

export type ProviderSummary = {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  priority: number;
  enabled: boolean;
  autoSyncEnabled: boolean;
  lastBalanceCents: number | null;
  lastBalanceAt: string | null;
  lastConnection: { success: boolean; createdAt: string } | null;
};

export type ListProvidersResult =
  | { ok: true; providers: ProviderSummary[] }
  | { ok: false; error: string };

/** Provider Center (Chapter 12): every configured provider, priority-ordered. */
export async function listProvidersAction(initData: string): Promise<ListProvidersResult> {
  try {
    await requireStaff(initData);

    const providers = await prisma.provider.findMany({
      orderBy: { priority: "asc" },
      include: { connectionLogs: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    return {
      ok: true,
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        priority: provider.priority,
        enabled: provider.enabled,
        autoSyncEnabled: provider.autoSyncEnabled,
        lastBalanceCents: provider.lastBalanceCents,
        lastBalanceAt: provider.lastBalanceAt?.toISOString() ?? null,
        lastConnection: provider.connectionLogs[0]
          ? {
              success: provider.connectionLogs[0].success,
              createdAt: provider.connectionLogs[0].createdAt.toISOString(),
            }
          : null,
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load providers";
    return { ok: false, error: message };
  }
}

export type ProviderDetail = {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  username: string | null;
  apiKeyMasked: string | null;
  apiSecretMasked: string | null;
  tokenMasked: string | null;
  timeoutMs: number;
  priority: number;
  enabled: boolean;
  autoSyncEnabled: boolean;
};

export type GetProviderDetailResult =
  | { ok: true; provider: ProviderDetail }
  | { ok: false; error: string };

/** Loads a single provider (secrets masked) to prefill the admin edit form. */
export async function getProviderDetailAction(
  initData: string,
  providerId: string,
): Promise<GetProviderDetailResult> {
  try {
    await requireStaff(initData);

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    return {
      ok: true,
      provider: {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        baseUrl: provider.baseUrl,
        username: provider.username,
        apiKeyMasked: maskSecret(provider.apiKey),
        apiSecretMasked: maskSecret(provider.apiSecret),
        tokenMasked: maskSecret(provider.token),
        timeoutMs: provider.timeoutMs,
        priority: provider.priority,
        enabled: provider.enabled,
        autoSyncEnabled: provider.autoSyncEnabled,
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load provider";
    return { ok: false, error: message };
  }
}

export type ProviderInput = {
  name: string;
  type: ProviderType;
  baseUrl: string;
  username: string | null;
  /** Blank/undefined on edit means "leave the stored secret unchanged". */
  apiKey?: string | null;
  apiSecret?: string | null;
  token?: string | null;
  timeoutMs: number;
  priority: number;
  autoSyncEnabled: boolean;
};

export type CreateProviderResult = { ok: true } | { ok: false; error: string };

/** Add a provider (Chapter 12). Core app logic never depends on the type — see Chapter 13's connector. */
export async function createProviderAction(
  initData: string,
  input: ProviderInput,
): Promise<CreateProviderResult> {
  try {
    const admin = await requireAdmin(initData);

    const name = input.name.trim();
    const baseUrl = input.baseUrl.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!baseUrl) return { ok: false, error: "Base URL is required" };
    if (!Number.isInteger(input.timeoutMs) || input.timeoutMs <= 0) {
      return { ok: false, error: "Timeout must be a positive number of milliseconds" };
    }

    await prisma.provider.create({
      data: {
        name,
        type: input.type,
        baseUrl,
        username: input.username?.trim() || null,
        apiKey: input.apiKey?.trim() || null,
        apiSecret: input.apiSecret?.trim() || null,
        token: input.token?.trim() || null,
        timeoutMs: input.timeoutMs,
        priority: input.priority,
        autoSyncEnabled: input.autoSyncEnabled,
      },
    });

    await logAdminAction(admin.id, "provider.create", name);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to create provider";
    return { ok: false, error: message };
  }
}

export type UpdateProviderResult = { ok: true } | { ok: false; error: string };

/** Edit a provider. Leaving a secret field blank keeps the existing stored value. */
export async function updateProviderAction(
  initData: string,
  providerId: string,
  input: ProviderInput,
): Promise<UpdateProviderResult> {
  try {
    const admin = await requireAdmin(initData);

    const name = input.name.trim();
    const baseUrl = input.baseUrl.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!baseUrl) return { ok: false, error: "Base URL is required" };
    if (!Number.isInteger(input.timeoutMs) || input.timeoutMs <= 0) {
      return { ok: false, error: "Timeout must be a positive number of milliseconds" };
    }

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        name,
        type: input.type,
        baseUrl,
        username: input.username?.trim() || null,
        ...(input.apiKey?.trim() ? { apiKey: input.apiKey.trim() } : {}),
        ...(input.apiSecret?.trim() ? { apiSecret: input.apiSecret.trim() } : {}),
        ...(input.token?.trim() ? { token: input.token.trim() } : {}),
        timeoutMs: input.timeoutMs,
        priority: input.priority,
        autoSyncEnabled: input.autoSyncEnabled,
      },
    });

    await logAdminAction(admin.id, "provider.update", name);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update provider";
    return { ok: false, error: message };
  }
}

export type SetProviderEnabledResult = { ok: true } | { ok: false; error: string };

export async function setProviderEnabledAction(
  initData: string,
  providerId: string,
  enabled: boolean,
): Promise<SetProviderEnabledResult> {
  try {
    const admin = await requireAdmin(initData);
    const provider = await prisma.provider.update({ where: { id: providerId }, data: { enabled } });
    await logAdminAction(admin.id, "provider.status", `${provider.name} -> ${enabled ? "enabled" : "disabled"}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update status";
    return { ok: false, error: message };
  }
}

export type DeleteProviderResult = { ok: true } | { ok: false; error: string };

export async function deleteProviderAction(
  initData: string,
  providerId: string,
): Promise<DeleteProviderResult> {
  try {
    const admin = await requireAdmin(initData);
    const provider = await prisma.provider.delete({ where: { id: providerId } });
    await logAdminAction(admin.id, "provider.delete", provider.name);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to delete provider" };
  }
}

export type TestProviderConnectionResult =
  | { ok: true; success: boolean; responseTimeMs: number; statusCode: number | null; errorMessage: string | null }
  | { ok: false; error: string };

/**
 * Generic, provider-type-agnostic reachability check: does baseUrl respond at
 * all, and how fast. Per-provider authenticated calls (getBalance, etc.)
 * belong to the connector engine (Chapter 13) — this only proves the URL is
 * live, which is what "Test API connection" means before a connector exists.
 */
export async function testProviderConnectionAction(
  initData: string,
  providerId: string,
): Promise<TestProviderConnectionResult> {
  try {
    const admin = await requireAdmin(initData);

    const provider = await prisma.provider.findUnique({ where: { id: providerId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const startedAt = Date.now();
    let success = false;
    let statusCode: number | null = null;
    let errorMessage: string | null = null;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), provider.timeoutMs);
      try {
        const response = await fetch(provider.baseUrl, { method: "GET", signal: controller.signal });
        statusCode = response.status;
        success = response.status < 500;
      } finally {
        clearTimeout(timeout);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : "Connection failed";
    }

    const responseTimeMs = Date.now() - startedAt;

    await prisma.providerConnectionLog.create({
      data: { providerId, success, responseTimeMs, statusCode, errorMessage },
    });
    await logAdminAction(admin.id, "provider.test-connection", `${provider.name} -> ${success ? "ok" : "failed"}`);

    return { ok: true, success, responseTimeMs, statusCode, errorMessage };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to test connection";
    return { ok: false, error: message };
  }
}

export type ProviderConnectionLogSummary = {
  id: string;
  success: boolean;
  responseTimeMs: number | null;
  statusCode: number | null;
  errorMessage: string | null;
  createdAt: string;
};

export type ListProviderConnectionLogsResult =
  | { ok: true; logs: ProviderConnectionLogSummary[] }
  | { ok: false; error: string };

/** View connection history (Chapter 12): recent "Test API connection" results. */
export async function listProviderConnectionLogsAction(
  initData: string,
  providerId: string,
): Promise<ListProviderConnectionLogsResult> {
  try {
    await requireStaff(initData);

    const logs = await prisma.providerConnectionLog.findMany({
      where: { providerId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return {
      ok: true,
      logs: logs.map((log) => ({
        id: log.id,
        success: log.success,
        responseTimeMs: log.responseTimeMs,
        statusCode: log.statusCode,
        errorMessage: log.errorMessage,
        createdAt: log.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load history";
    return { ok: false, error: message };
  }
}
