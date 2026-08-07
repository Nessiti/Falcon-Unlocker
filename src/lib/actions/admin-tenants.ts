"use server";

import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { TenantStatus, SubscriptionPlan } from "@/generated/prisma/client";
import { encryptSecret, decryptSecret } from "@/lib/security/encryption";
import { registerTenantWebhook } from "@/lib/telegram/webhook-registration";

function maskToken(value: string | null): string | null {
  if (!value) return null;
  const plaintext = decryptSecret(value);
  if (plaintext.length <= 4) return "••••";
  return `••••${plaintext.slice(-4)}`;
}

export type TenantSummary = {
  id: string;
  name: string;
  telegramBotUsername: string | null;
  botTokenMasked: string | null;
  ownerTelegramId: string | null;
  email: string | null;
  currency: string;
  country: string | null;
  language: string;
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  status: TenantStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionExpiresAt: string | null;
  userCount: number;
  createdAt: string;
};

export type ListTenantsResult = { ok: true; tenants: TenantSummary[] } | { ok: false; error: string };

/** Super Admin's Tenants dashboard (multi-tenant foundation): every brand on the platform. */
export async function listTenantsAction(initData: string): Promise<ListTenantsResult> {
  try {
    await requireSuperAdmin(initData);

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: "asc" },
      include: { _count: { select: { users: true } } },
    });

    return {
      ok: true,
      tenants: tenants.map((tenant) => ({
        id: tenant.id,
        name: tenant.name,
        telegramBotUsername: tenant.telegramBotUsername,
        botTokenMasked: maskToken(tenant.telegramBotToken),
        ownerTelegramId: tenant.ownerTelegramId?.toString() ?? null,
        email: tenant.email,
        currency: tenant.currency,
        country: tenant.country,
        language: tenant.language,
        logoUrl: tenant.logoUrl,
        primaryColor: tenant.primaryColor,
        secondaryColor: tenant.secondaryColor,
        status: tenant.status,
        subscriptionPlan: tenant.subscriptionPlan,
        subscriptionExpiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
        userCount: tenant._count.users,
        createdAt: tenant.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load tenants";
    return { ok: false, error: message };
  }
}

export type CreateTenantInput = {
  name: string;
  telegramBotUsername: string | null;
  telegramBotToken: string | null;
  ownerTelegramId: string | null;
  email: string | null;
};

export type CreateTenantResult =
  | { ok: true; webhookWarning?: string }
  | { ok: false; error: string };

/**
 * Add a new brand (vision chapter 3) — the platform's core self-serve-onboarding
 * primitive. Only sets the structural/registration facts (name, bot connection,
 * owner, contact email): logo, colors, currency, country and language are the
 * brand's own presentation/locale choices, not the Super Admin's to set — the
 * brand's own Admin configures those via Brand Settings (src/lib/actions/
 * brand-settings.ts) once they have access. New tenants get the schema
 * defaults (USD, English, no logo/colors) until then.
 */
export async function createTenantAction(
  initData: string,
  input: CreateTenantInput,
): Promise<CreateTenantResult> {
  try {
    const superAdmin = await requireSuperAdmin(initData);

    const name = input.name.trim();
    if (!name) return { ok: false, error: "Brand name is required" };

    let ownerTelegramId: bigint | null = null;
    if (input.ownerTelegramId?.trim()) {
      try {
        ownerTelegramId = BigInt(input.ownerTelegramId.trim());
      } catch {
        return { ok: false, error: "Owner Telegram ID must be a number" };
      }
    }

    const botToken = input.telegramBotToken?.trim() || null;

    const tenant = await prisma.tenant.create({
      data: {
        name,
        telegramBotUsername: input.telegramBotUsername?.trim() || null,
        telegramBotToken: botToken ? encryptSecret(botToken) : null,
        ownerTelegramId,
        email: input.email?.trim() || null,
      },
    });

    await logAdminAction(superAdmin.id, "tenant.create", name);

    // Registers the bot's webhook automatically so a new brand's bot is
    // usable immediately, without the Super Admin needing to run a manual
    // Telegram API call. A failure here doesn't roll back tenant creation —
    // the "Register Webhook" button on this tenant's row retries the exact
    // same call once the underlying issue (bad token, missing env var) is fixed.
    let webhookWarning: string | undefined;
    if (botToken) {
      const result = await registerTenantWebhook(tenant.id, botToken);
      if (!result.ok) webhookWarning = result.error;
    }

    return webhookWarning ? { ok: true, webhookWarning } : { ok: true };
  } catch (error) {
    if (error instanceof Error && error.message === "ENCRYPTION_KEY is not configured") {
      return { ok: false, error: "Server misconfiguration: ENCRYPTION_KEY is not set" };
    }
    const message = error instanceof TelegramAuthError ? error.message : "Failed to create tenant";
    return { ok: false, error: message };
  }
}

export type RegisterTenantWebhookResult = { ok: true } | { ok: false; error: string };

/**
 * Manual (re-)registration of a tenant's bot webhook — for tenants created
 * before this automation existed, or to retry after fixing a bad token or
 * env var without recreating the whole brand.
 */
export async function registerTenantWebhookAction(
  initData: string,
  tenantId: string,
): Promise<RegisterTenantWebhookResult> {
  try {
    await requireSuperAdmin(initData);

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { telegramBotToken: true },
    });
    if (!tenant?.telegramBotToken) {
      return { ok: false, error: "This brand has no bot token configured" };
    }

    const token = decryptSecret(tenant.telegramBotToken);
    const result = await registerTenantWebhook(tenantId, token);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to register webhook";
    return { ok: false, error: message };
  }
}

export type SetTenantStatusResult = { ok: true } | { ok: false; error: string };

/** Suspend/reactivate a brand (vision chapter 15) — data is kept, access is not. */
export async function setTenantStatusAction(
  initData: string,
  tenantId: string,
  status: TenantStatus,
): Promise<SetTenantStatusResult> {
  try {
    const superAdmin = await requireSuperAdmin(initData);
    if (tenantId === "falcon-unlocker" && status === TenantStatus.SUSPENDED) {
      return { ok: false, error: "The platform's own tenant cannot be suspended" };
    }

    const tenant = await prisma.tenant.update({ where: { id: tenantId }, data: { status } });
    await logAdminAction(superAdmin.id, "tenant.status", `${tenant.name} -> ${status}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update tenant status";
    return { ok: false, error: message };
  }
}
