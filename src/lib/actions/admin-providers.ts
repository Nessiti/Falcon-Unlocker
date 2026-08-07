"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { ProviderType, SyncFrequency } from "@/generated/prisma/client";
import { getProviderConnector } from "@/lib/providers/registry";
import { syncProvider } from "@/lib/providers/sync-engine";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";

/** Decrypts (Chapter 19) before masking, so the preview always reflects the real plaintext. */
function maskSecret(value: string | null): string | null {
  if (!value) return null;
  const plaintext = decryptSecret(value);
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}

export type ProviderSummary = {
  id: string;
  name: string;
  type: ProviderType;
  baseUrl: string;
  priority: number;
  enabled: boolean;
  syncFrequency: SyncFrequency;
  lastSyncAt: string | null;
  lastBalanceCents: number | null;
  lastBalanceAt: string | null;
  lastConnection: { success: boolean; createdAt: string } | null;
  secretsRotatedAt: string | null;
  rateLimitPerMinute: number | null;
};

export type ListProvidersResult =
  | { ok: true; providers: ProviderSummary[] }
  | { ok: false; error: string };

/** Provider Center (Chapter 12): every provider configured for the staff member's own tenant, priority-ordered. */
export async function listProvidersAction(initData: string): Promise<ListProvidersResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const providers = await prisma.provider.findMany({
      where: { tenantId },
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
        syncFrequency: provider.syncFrequency,
        lastSyncAt: provider.lastSyncAt?.toISOString() ?? null,
        lastBalanceCents: provider.lastBalanceCents,
        lastBalanceAt: provider.lastBalanceAt?.toISOString() ?? null,
        lastConnection: provider.connectionLogs[0]
          ? {
              success: provider.connectionLogs[0].success,
              createdAt: provider.connectionLogs[0].createdAt.toISOString(),
            }
          : null,
        secretsRotatedAt: provider.secretsRotatedAt?.toISOString() ?? null,
        rateLimitPerMinute: provider.rateLimitPerMinute,
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
  syncFrequency: SyncFrequency;
  rateLimitPerMinute: number | null;
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
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId } });
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
        syncFrequency: provider.syncFrequency,
        rateLimitPerMinute: provider.rateLimitPerMinute,
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
  syncFrequency: SyncFrequency;
  rateLimitPerMinute: number | null;
};

export type CreateProviderResult = { ok: true } | { ok: false; error: string };

/** Add a provider (Chapter 12), scoped to the admin's own tenant. Core app logic never depends on the type — see Chapter 13's connector. */
export async function createProviderAction(
  initData: string,
  input: ProviderInput,
): Promise<CreateProviderResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const name = input.name.trim();
    const baseUrl = input.baseUrl.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!baseUrl) return { ok: false, error: "Base URL is required" };
    if (!Number.isInteger(input.timeoutMs) || input.timeoutMs <= 0) {
      return { ok: false, error: "Timeout must be a positive number of milliseconds" };
    }

    const hasSecret = Boolean(input.apiKey?.trim() || input.apiSecret?.trim() || input.token?.trim());

    await prisma.provider.create({
      data: {
        name,
        type: input.type,
        baseUrl,
        username: input.username?.trim() || null,
        apiKey: input.apiKey?.trim() ? encryptSecret(input.apiKey.trim()) : null,
        apiSecret: input.apiSecret?.trim() ? encryptSecret(input.apiSecret.trim()) : null,
        token: input.token?.trim() ? encryptSecret(input.token.trim()) : null,
        secretsRotatedAt: hasSecret ? new Date() : null,
        timeoutMs: input.timeoutMs,
        priority: input.priority,
        syncFrequency: input.syncFrequency,
        rateLimitPerMinute: input.rateLimitPerMinute,
        tenantId,
      },
    });

    await logAdminAction(admin.id, "provider.create", name);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ENCRYPTION_KEY is not configured") {
      return { ok: false, error: "Server misconfiguration: ENCRYPTION_KEY is not set" };
    }
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
    const tenantId = requireTenantId(admin);

    const name = input.name.trim();
    const baseUrl = input.baseUrl.trim();
    if (!name) return { ok: false, error: "Name is required" };
    if (!baseUrl) return { ok: false, error: "Base URL is required" };
    if (!Number.isInteger(input.timeoutMs) || input.timeoutMs <= 0) {
      return { ok: false, error: "Timeout must be a positive number of milliseconds" };
    }

    const owned = await prisma.provider.findFirst({ where: { id: providerId, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "Provider not found" };

    const rotatingSecret = Boolean(
      input.apiKey?.trim() || input.apiSecret?.trim() || input.token?.trim(),
    );

    await prisma.provider.update({
      where: { id: providerId },
      data: {
        name,
        type: input.type,
        baseUrl,
        username: input.username?.trim() || null,
        ...(input.apiKey?.trim() ? { apiKey: encryptSecret(input.apiKey.trim()) } : {}),
        ...(input.apiSecret?.trim() ? { apiSecret: encryptSecret(input.apiSecret.trim()) } : {}),
        ...(input.token?.trim() ? { token: encryptSecret(input.token.trim()) } : {}),
        ...(rotatingSecret ? { secretsRotatedAt: new Date() } : {}),
        timeoutMs: input.timeoutMs,
        priority: input.priority,
        syncFrequency: input.syncFrequency,
        rateLimitPerMinute: input.rateLimitPerMinute,
      },
    });

    await logAdminAction(admin.id, "provider.update", name);
    return { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ENCRYPTION_KEY is not configured") {
      return { ok: false, error: "Server misconfiguration: ENCRYPTION_KEY is not set" };
    }
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
    const tenantId = requireTenantId(admin);

    const owned = await prisma.provider.findFirst({ where: { id: providerId, tenantId }, select: { name: true } });
    if (!owned) return { ok: false, error: "Provider not found" };

    await prisma.provider.update({ where: { id: providerId }, data: { enabled } });
    await logAdminAction(admin.id, "provider.status", `${owned.name} -> ${enabled ? "enabled" : "disabled"}`);
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
    const tenantId = requireTenantId(admin);

    const owned = await prisma.provider.findFirst({ where: { id: providerId, tenantId }, select: { name: true } });
    if (!owned) return { ok: false, error: "Provider not found" };

    await prisma.provider.delete({ where: { id: providerId } });
    await logAdminAction(admin.id, "provider.delete", owned.name);
    return { ok: true };
  } catch {
    return { ok: false, error: "Failed to delete provider" };
  }
}

export type TestProviderConnectionResult =
  | { ok: true; success: boolean; responseTimeMs: number; statusCode: number | null; errorMessage: string | null }
  | { ok: false; error: string };

/**
 * Runs through the Chapter 13 connector engine — the core app never talks
 * to a provider's raw API, only through ProviderConnector.testConnection().
 */
export async function testProviderConnectionAction(
  initData: string,
  providerId: string,
): Promise<TestProviderConnectionResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const { success, responseTimeMs, statusCode, errorMessage } =
      await getProviderConnector(provider).testConnection();

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
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const owned = await prisma.provider.findFirst({ where: { id: providerId, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "Provider not found" };

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

export type RefreshProviderBalanceResult =
  | { ok: true; balanceCents: number }
  | { ok: false; error: string };

/** "View provider balance" (Chapter 12), now backed by the real connector (Chapter 13). */
export async function refreshProviderBalanceAction(
  initData: string,
  providerId: string,
): Promise<RefreshProviderBalanceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const result = await getProviderConnector(provider).getBalance();
    if (!result.ok) {
      await logAdminAction(admin.id, "provider.balance-refresh", `${provider.name} -> failed: ${result.error}`);
      return { ok: false, error: result.error };
    }

    await prisma.provider.update({
      where: { id: providerId },
      data: { lastBalanceCents: result.balanceCents, lastBalanceAt: new Date() },
    });
    await logAdminAction(admin.id, "provider.balance-refresh", `${provider.name} -> ${result.balanceCents}`);

    return { ok: true, balanceCents: result.balanceCents };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to refresh balance";
    return { ok: false, error: message };
  }
}

export type SyncProviderResult =
  | {
      ok: true;
      connectionOk: boolean;
      balanceUpdated: boolean;
      imeiMappingsUpdated: number;
      serverMappingsUpdated: number;
      catalogError: string | null;
    }
  | { ok: false; error: string };

/**
 * Automatic Synchronization (Chapter 16), triggered manually via "Sync Now".
 * Refreshes connection status, balance, and cached mapping data (name,
 * price, category, estimated time) — never the admin's own service records.
 * The same logic runs on a schedule as the sync-providers task, invoked via
 * the unified /api/cron endpoint (see src/lib/cron/).
 */
export async function syncProviderAction(
  initData: string,
  providerId: string,
): Promise<SyncProviderResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const provider = await prisma.provider.findFirst({ where: { id: providerId, tenantId } });
    if (!provider) return { ok: false, error: "Provider not found" };

    const result = await syncProvider(provider);
    await logAdminAction(
      admin.id,
      "provider.sync",
      `${provider.name} -> ${result.connectionOk ? "online" : "offline"}, ${result.imeiMappingsUpdated + result.serverMappingsUpdated} mappings refreshed`,
    );

    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to sync provider";
    return { ok: false, error: message };
  }
}
