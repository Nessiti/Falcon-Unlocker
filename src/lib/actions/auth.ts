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

    const user = await prisma.$transaction(async (tx) => {
      const existing = await tx.user.findUnique({ where: { telegramId } });

      if (existing) {
        return tx.user.update({
          where: { id: existing.id },
          data: {
            username: tgUser.username ?? null,
            firstName: tgUser.first_name,
            lastName: tgUser.last_name ?? null,
            avatarUrl: tgUser.photo_url ?? null,
            // Never downgrades a Super Admin (multi-tenant foundation) back
            // to Admin just because their Telegram ID also matches
            // TELEGRAM_ADMIN_ID — that would silently undo the promotion on
            // every login.
            role: isConfiguredAdmin && existing.role !== Role.SUPER_ADMIN ? Role.ADMIN : existing.role,
            // Self-heals accounts created in the window between Chapter 24
            // (tenantId added, nullable) and this chapter (tenantId actually
            // assigned at signup) — never overwrites an already-set tenantId.
            ...(existing.tenantId ? {} : { tenantId: resolvedTenantId }),
          },
        });
      }

      // isFirstUser (and the free Admin role that comes with it) is scoped
      // to Falcon Unlocker specifically — the very first person to ever use
      // the platform, not the first customer of every new tenant going
      // forward. A brand-new tenant's first real signup is an ordinary
      // Customer; its Admin is whoever the Super Admin set as owner.
      const isFirstUser = resolvedTenantId === "falcon-unlocker" && (await tx.user.count()) === 0;

      return tx.user.create({
        data: {
          telegramId,
          username: tgUser.username ?? null,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name ?? null,
          avatarUrl: tgUser.photo_url ?? null,
          isFirstUser,
          role: isFirstUser || isConfiguredAdmin ? Role.ADMIN : Role.CUSTOMER,
          tenantId: resolvedTenantId,
        },
      });
    });

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
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to sign in";
    return { ok: false, error: message };
  }
}
