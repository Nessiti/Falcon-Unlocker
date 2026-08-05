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
    const parsed = await verifyTelegramInitData(initData);
    const tgUser = parsed.user;
    if (!tgUser) {
      return { ok: false, error: "No Telegram user in init data" };
    }

    const telegramId = BigInt(tgUser.id);
    const isConfiguredAdmin = process.env.TELEGRAM_ADMIN_ID === String(tgUser.id);

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
            role: isConfiguredAdmin ? Role.ADMIN : existing.role,
          },
        });
      }

      const isFirstUser = (await tx.user.count()) === 0;

      return tx.user.create({
        data: {
          telegramId,
          username: tgUser.username ?? null,
          firstName: tgUser.first_name,
          lastName: tgUser.last_name ?? null,
          avatarUrl: tgUser.photo_url ?? null,
          isFirstUser,
          role: isFirstUser || isConfiguredAdmin ? Role.ADMIN : Role.CUSTOMER,
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
