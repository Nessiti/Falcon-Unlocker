import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

/** Sends a Telegram notification to every registered user in one tenant (Chapter 11: Popup/Notifications broadcast). */
export async function broadcastToAllUsers(tenantId: string, send: (telegramId: bigint) => Promise<void>) {
  const users = await prisma.user.findMany({ where: { tenantId }, select: { telegramId: true } });
  await Promise.all(users.map((user) => send(user.telegramId)));
  return users.length;
}

/** Sends a Telegram notification to every Admin/Moderator of one tenant (e.g. new order alerts). */
export async function notifyAllStaff(tenantId: string, send: (telegramId: bigint) => Promise<void>) {
  const staff = await prisma.user.findMany({
    where: { tenantId, role: { in: [Role.ADMIN, Role.MODERATOR, Role.SUPER_ADMIN] } },
    select: { telegramId: true },
  });
  await Promise.all(staff.map((user) => send(user.telegramId)));
}
