import "server-only";
import { prisma } from "@/lib/prisma";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/telegram/auth";
import { Role, type User } from "@/generated/prisma/client";

/**
 * Verifies initData and requires the matching account to have the Admin
 * role. Shared by every "Created by Admin only" rule (Chapters 4, 5, 11).
 */
export async function requireAdmin(initData: string): Promise<User> {
  const parsed = await verifyTelegramInitData(initData);
  const tgUser = parsed.user;
  if (!tgUser) {
    throw new TelegramAuthError("No Telegram user in init data");
  }

  const user = await prisma.user.findUnique({ where: { telegramId: BigInt(tgUser.id) } });
  if (!user || user.role !== Role.ADMIN) {
    throw new TelegramAuthError("Admin access required");
  }

  return user;
}
