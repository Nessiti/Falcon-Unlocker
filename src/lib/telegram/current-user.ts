import "server-only";
import { prisma } from "@/lib/prisma";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/telegram/auth";
import type { User } from "@/generated/prisma/client";

/**
 * Verifies initData and loads the matching account. Shared by every
 * authenticated action (orders, wallet, account, admin gates, ...).
 */
export async function getCurrentUser(initData: string): Promise<User> {
  const parsed = await verifyTelegramInitData(initData);
  const tgUser = parsed.user;
  if (!tgUser) {
    throw new TelegramAuthError("No Telegram user in init data");
  }

  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
  if (!user) {
    throw new TelegramAuthError("Account not found");
  }

  return user;
}
