"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { notifyPromotion, notifyMaintenance } from "@/lib/telegram/notifications";
import { broadcastToAllUsers } from "@/lib/telegram/broadcast";

export type BroadcastKind = "PROMOTION" | "MAINTENANCE";
export type BroadcastInput = { kind: BroadcastKind; title: string; message: string };
export type BroadcastResult = { ok: true } | { ok: false; error: string };

/** Admin Notifications section: broadcasts a Promotion or Maintenance message to every user. */
export async function sendBroadcastAction(
  initData: string,
  input: BroadcastInput,
): Promise<BroadcastResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const title = input.title.trim();
    const message = input.message.trim();
    if (!message) return { ok: false, error: "Message is required" };
    if (input.kind === "PROMOTION" && !title) return { ok: false, error: "Title is required" };

    const recipientCount =
      input.kind === "PROMOTION"
        ? await broadcastToAllUsers(tenantId, (telegramId) => notifyPromotion(telegramId, tenantId, title, message))
        : await broadcastToAllUsers(tenantId, (telegramId) => notifyMaintenance(telegramId, tenantId, message));

    await prisma.notification.create({
      data: {
        kind: input.kind,
        title: input.kind === "PROMOTION" ? title : null,
        message,
        recipientCount,
        sentById: staff.id,
        tenantId,
      },
    });

    await logAdminAction(staff.id, "notification.broadcast", `${input.kind}: ${title || message}`);

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to send broadcast";
    return { ok: false, error: message };
  }
}

export type NotificationSummary = {
  id: string;
  kind: BroadcastKind;
  title: string | null;
  message: string;
  recipientCount: number;
  sentByName: string;
  createdAt: string;
};

export type ListNotificationsResult =
  | { ok: true; notifications: NotificationSummary[] }
  | { ok: false; error: string };

/** Admin Notifications section: history of past broadcasts. */
export async function listNotificationsAction(initData: string): Promise<ListNotificationsResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const notifications = await prisma.notification.findMany({
      where: { tenantId },
      include: { sentBy: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return {
      ok: true,
      notifications: notifications.map((n) => ({
        id: n.id,
        kind: n.kind,
        title: n.title,
        message: n.message,
        recipientCount: n.recipientCount,
        sentByName: [n.sentBy.firstName, n.sentBy.lastName].filter(Boolean).join(" "),
        createdAt: n.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load notification history";
    return { ok: false, error: message };
  }
}
