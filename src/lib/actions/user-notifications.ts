"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type UserNotificationSummary = {
  id: string;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
};

export type ListMyNotificationsResult =
  | { ok: true; notifications: UserNotificationSummary[]; unreadCount: number }
  | { ok: false; error: string };

const MAX_NOTIFICATIONS = 50;

/** The customer's own in-app notification feed - a mirror of what the bot already sent to their Telegram chat. */
export async function listMyNotificationsAction(initData: string): Promise<ListMyNotificationsResult> {
  try {
    const user = await getCurrentUser(initData);

    const [notifications, unreadCount] = await Promise.all([
      prisma.userNotification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: MAX_NOTIFICATIONS,
      }),
      prisma.userNotification.count({ where: { userId: user.id, readAt: null } }),
    ]);

    return {
      ok: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        message: n.message,
        link: n.link,
        read: n.readAt !== null,
        createdAt: n.createdAt.toISOString(),
      })),
      unreadCount,
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load notifications";
    return { ok: false, error: message };
  }
}

export type MarkNotificationsReadResult = { ok: true } | { ok: false; error: string };

export async function markAllNotificationsReadAction(
  initData: string,
): Promise<MarkNotificationsReadResult> {
  try {
    const user = await getCurrentUser(initData);
    await prisma.userNotification.updateMany({
      where: { userId: user.id, readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update notifications";
    return { ok: false, error: message };
  }
}
