import "server-only";
import { prisma } from "@/lib/prisma";

/** Sends a Telegram notification to every registered user (Chapter 11: Popup/Notifications broadcast). */
export async function broadcastToAllUsers(send: (telegramId: bigint) => Promise<void>) {
  const users = await prisma.user.findMany({ select: { telegramId: true } });
  await Promise.all(users.map((user) => send(user.telegramId)));
}
