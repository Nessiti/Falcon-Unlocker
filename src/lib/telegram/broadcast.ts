import "server-only";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/client";

/** Sends a Telegram notification to every registered user (Chapter 11: Popup/Notifications broadcast). */
export async function broadcastToAllUsers(send: (telegramId: bigint) => Promise<void>) {
  const users = await prisma.user.findMany({ select: { telegramId: true } });
  await Promise.all(users.map((user) => send(user.telegramId)));
  return users.length;
}

/** Sends a Telegram notification to every Admin/Moderator (e.g. new order alerts). */
export async function notifyAllStaff(send: (telegramId: bigint) => Promise<void>) {
  const staff = await prisma.user.findMany({
    where: { role: { in: [Role.ADMIN, Role.MODERATOR] } },
    select: { telegramId: true },
  });
  await Promise.all(staff.map((user) => send(user.telegramId)));
}
