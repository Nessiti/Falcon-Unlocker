"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { generateApiCredentials, hashApiSecret } from "@/lib/reseller-api/crypto";

export type ApiKeySummary = {
  id: string;
  key: string;
  label: string | null;
  enabled: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  customerName: string;
  customerId: string;
};

export type ListApiKeysResult = { ok: true; keys: ApiKeySummary[] } | { ok: false; error: string };

/** Reseller API keys (vision: DHRU/GSM Theme-standard reseller access) for the tenant's own customers. */
export async function listApiKeysAction(initData: string): Promise<ListApiKeysResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const keys = await prisma.apiKey.findMany({
      where: { tenantId },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    });

    return {
      ok: true,
      keys: keys.map((k) => ({
        id: k.id,
        key: k.key,
        label: k.label,
        enabled: k.enabled,
        createdAt: k.createdAt.toISOString(),
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        customerName: [k.user.firstName, k.user.lastName].filter(Boolean).join(" "),
        customerId: k.userId,
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load API keys";
    return { ok: false, error: message };
  }
}

export type CreateApiKeyResult =
  | { ok: true; key: string; secret: string }
  | { ok: false; error: string };

/** Generates a key+secret pair for one of this tenant's own customers - the secret is only ever shown here, once. */
export async function createApiKeyAction(
  initData: string,
  input: { customerId: string; label: string | null },
): Promise<CreateApiKeyResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const customer = await prisma.user.findFirst({ where: { id: input.customerId, tenantId }, select: { id: true } });
    if (!customer) return { ok: false, error: "Customer not found" };

    const { key, secret } = generateApiCredentials();
    await prisma.apiKey.create({
      data: {
        key,
        secretHash: hashApiSecret(secret),
        label: input.label?.trim() || null,
        userId: customer.id,
        tenantId,
      },
    });

    await logAdminAction(admin.id, "apikey.create", `for user ${customer.id}`);
    return { ok: true, key, secret };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to create API key";
    return { ok: false, error: message };
  }
}

export type SetApiKeyEnabledResult = { ok: true } | { ok: false; error: string };

export async function setApiKeyEnabledAction(
  initData: string,
  id: string,
  enabled: boolean,
): Promise<SetApiKeyEnabledResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const owned = await prisma.apiKey.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "API key not found" };

    await prisma.apiKey.update({ where: { id }, data: { enabled } });
    await logAdminAction(admin.id, "apikey.status", `${id} -> ${enabled ? "enabled" : "disabled"}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update API key";
    return { ok: false, error: message };
  }
}

export type DeleteApiKeyResult = { ok: true } | { ok: false; error: string };

export async function deleteApiKeyAction(initData: string, id: string): Promise<DeleteApiKeyResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    const owned = await prisma.apiKey.findFirst({ where: { id, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "API key not found" };

    await prisma.apiKey.delete({ where: { id } });
    await logAdminAction(admin.id, "apikey.delete", id);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to delete API key";
    return { ok: false, error: message };
  }
}
