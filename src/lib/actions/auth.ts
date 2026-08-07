"use server";

import { prisma } from "@/lib/prisma";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/telegram/auth";
import { Role, UserStatus } from "@/generated/prisma/client";

const STATUS_MESSAGE: Record<string, string> = {
  [UserStatus.SUSPENDED]: "Your account is suspended. Contact support for help.",
  [UserStatus.BLOCKED]: "Your account has been blocked.",
};

export type AuthUser = {
  id: string;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  role: Role;
  isFirstUser: boolean;
  createdAt: string;
  balanceCents: number;
  hasPin: boolean;
  biometricEnabled: boolean;
  /** This account's own tenant's brand (Chapter 39) — the app shell reads
   * these instead of hardcoding Falcon Unlocker's own name/logo. */
  tenantName: string;
  tenantLogoUrl: string | null;
};

export type LoginResult = { ok: true; user: AuthUser } | { ok: false; error: string };

/**
 * Automatic Telegram login: verifies initData, then finds or creates the
 * matching account. No form, no password — identity comes entirely from
 * Telegram. The very first account ever created becomes Admin, and the
 * Telegram ID configured as TELEGRAM_ADMIN_ID is always granted Admin too.
 */
export async function loginAction(initData: string): Promise<LoginResult> {
  try {
    const { data: parsed, tenantId: resolvedTenantId } = await verifyTelegramInitData(initData);
    const tgUser = parsed.user;
    if (!tgUser) {
      return { ok: false, error: "No Telegram user in init data" };
    }

    const telegramId = BigInt(tgUser.id);
    // TELEGRAM_ADMIN_ID is Falcon Unlocker's own platform bootstrap env var
    // — it has no meaning for a brand-new signup through a different
    // tenant's bot, so it only ever grants Admin within Falcon's own tenant.
    const isConfiguredAdmin =
      resolvedTenantId === "falcon-unlocker" && process.env.TELEGRAM_ADMIN_ID === String(tgUser.id);

    // Every other tenant's equivalent bootstrap: the owner Telegram ID the
    // Super Admin set when creating the brand (Chapter 24) automatically
    // becomes that tenant's own Admin on first login — otherwise a
    // brand-new tenant would have no way to ever get an Admin at all, since
    // updateUserRoleAction requires an existing Admin to grant one.
    const tenant = await prisma.tenant.findUnique({
      where: { id: resolvedTenantId },
      select: { ownerTelegramId: true, name: true, logoUrl: true },
    });
    const isTenantOwner = tenant?.ownerTelegramId != null && tenant.ownerTelegramId === telegramId;

    // isFirstUser (and the free Admin role that comes with it) is scoped to
    // Falcon Unlocker specifically — the very first person to ever use the
    // platform, not the first customer of every new tenant going forward.
    // A brand-new tenant's first real signup is an ordinary Customer; its
    // Admin is whoever the Super Admin set as owner. Read outside the
    // upsert below rather than inside a transaction with it: Falcon
    // Unlocker has had a first user for a long time now, so a race on this
    // specific read has no real-world window left to matter.
    const isFirstUser =
      resolvedTenantId === "falcon-unlocker" &&
      (await prisma.user.count({ where: { tenantId: "falcon-unlocker" } })) === 0;

    // Chapter 37: the same Telegram person gets a separate, independent
    // account per tenant, so this upserts on (telegramId, tenantId), never
    // telegramId alone. A single native INSERT ... ON CONFLICT DO UPDATE —
    // not a manual find-then-create — so two concurrent logins for the
    // same brand-new pair (two tabs, Telegram occasionally opening the
    // Mini App twice) can't race into a unique-constraint error. (An
    // earlier version tried to catch and recover from that race manually
    // inside a $transaction; Postgres aborts the whole transaction on the
    // first failed statement, so the "recovery" query failed too, with a
    // second, more confusing error. upsert sidesteps the problem instead
    // of working around it.)
    let user = await prisma.user.upsert({
      where: { telegramId_tenantId: { telegramId, tenantId: resolvedTenantId } },
      update: {
        username: tgUser.username ?? null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        avatarUrl: tgUser.photo_url ?? null,
      },
      create: {
        telegramId,
        username: tgUser.username ?? null,
        firstName: tgUser.first_name,
        lastName: tgUser.last_name ?? null,
        avatarUrl: tgUser.photo_url ?? null,
        isFirstUser,
        role: isFirstUser || isConfiguredAdmin || isTenantOwner ? Role.ADMIN : Role.CUSTOMER,
        tenantId: resolvedTenantId,
      },
    });

    // Never downgrades a Super Admin (multi-tenant foundation) back to
    // Admin just because their Telegram ID also matches TELEGRAM_ADMIN_ID
    // or the tenant's owner id — that would silently undo the promotion on
    // every login. A separate follow-up write rather than folded into the
    // upsert's `update`, since that data is static and can't branch on the
    // row's pre-upsert role. Also self-heals an owner's account that was
    // created before this chapter, or before they were set as owner.
    if ((isConfiguredAdmin || isTenantOwner) && user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
      user = await prisma.user.update({ where: { id: user.id }, data: { role: Role.ADMIN } });
    }

    if (user.status !== UserStatus.ACTIVE) {
      return { ok: false, error: STATUS_MESSAGE[user.status] };
    }

    return {
      ok: true,
      user: {
        id: user.id,
        telegramId: user.telegramId.toString(),
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        avatarUrl: user.avatarUrl,
        role: user.role,
        isFirstUser: user.isFirstUser,
        createdAt: user.createdAt.toISOString(),
        balanceCents: user.balanceCents,
        hasPin: user.pinHash !== null,
        biometricEnabled: user.biometricEnabled,
        tenantName: tenant?.name ?? "Falcon Unlocker",
        tenantLogoUrl: tenant?.logoUrl ?? null,
      },
    };
  } catch (error) {
    // TelegramAuthError messages are safe to show as-is (they never contain
    // secrets). Anything else is an unexpected bug — logged here for
    // Vercel's Runtime Logs, never shown to the user: a customer-facing
    // screen has no business displaying a Prisma/JS error name or message.
    if (!(error instanceof TelegramAuthError)) {
      console.error("[auth] loginAction failed", error);
    }
    const message = error instanceof TelegramAuthError ? error.message : "Failed to sign in";
    return { ok: false, error: message };
  }
}
