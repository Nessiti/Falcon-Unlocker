import "server-only";
import { prisma } from "@/lib/prisma";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/telegram/auth";
import { UserStatus, type User } from "@/generated/prisma/client";

const STATUS_MESSAGE: Record<string, string> = {
  [UserStatus.SUSPENDED]: "Your account is suspended. Contact support for help.",
  [UserStatus.BLOCKED]: "Your account has been blocked.",
};

/**
 * Verifies initData and loads the matching account. Shared by every
 * authenticated action (orders, wallet, account, admin gates, ...).
 * Rejects suspended/blocked accounts (Chapter 11 User Management).
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
  if (user.status !== UserStatus.ACTIVE) {
    throw new TelegramAuthError(STATUS_MESSAGE[user.status]);
  }

  return user;
}
