"use server";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { generateApiCredentials, hashApiSecret } from "@/lib/reseller-api/crypto";

/**
 * Admin-only surface, so it's safe (and, given how hard this was to
 * diagnose blind, necessary) to put the real error detail directly in what
 * the admin sees instead of a generic message with nothing to go on -
 * still logs server-side too, for anything that also needs a stack trace.
 */
function describeError(error: unknown, fallback: string): string {
  if (error instanceof TelegramAuthError) return error.message;
  console.error(`[admin-api-keys] ${fallback}`, error);
  const detail = error instanceof Error ? error.message : String(error);
  return `${fallback}: ${detail}`;
}

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
    return { ok: false, error: describeError(error, "Failed to load API keys") };
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
    return { ok: false, error: describeError(error, "Failed to create API key") };
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
    return { ok: false, error: describeError(error, "Failed to update API key") };
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
    return { ok: false, error: describeError(error, "Failed to delete API key") };
  }
}
