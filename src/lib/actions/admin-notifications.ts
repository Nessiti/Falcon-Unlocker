"use server";

import { requireStaff } from "@/lib/telegram/admin";
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

    const title = input.title.trim();
    const message = input.message.trim();
    if (!message) return { ok: false, error: "Message is required" };
    if (input.kind === "PROMOTION" && !title) return { ok: false, error: "Title is required" };

    if (input.kind === "PROMOTION") {
      await broadcastToAllUsers((telegramId) => notifyPromotion(telegramId, title, message));
    } else {
      await broadcastToAllUsers((telegramId) => notifyMaintenance(telegramId, message));
    }

    await logAdminAction(staff.id, "notification.broadcast", `${input.kind}: ${title || message}`);

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to send broadcast";
    return { ok: false, error: message };
  }
}
