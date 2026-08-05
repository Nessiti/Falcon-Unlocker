"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { notifyPromotion } from "@/lib/telegram/notifications";
import { broadcastToAllUsers } from "@/lib/telegram/broadcast";

export type PopupSummary = {
  id: string;
  title: string;
  message: string;
  color: string | null;
  imageUrl: string | null;
  animation: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
};

/** The active, not-yet-expired popup to show customers (Chapter 11: Popup). */
export async function getActivePopupAction(): Promise<PopupSummary | null> {
  const popup = await prisma.popup.findFirst({
    where: {
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!popup) return null;

  return {
    id: popup.id,
    title: popup.title,
    message: popup.message,
    color: popup.color,
    imageUrl: popup.imageUrl,
    animation: popup.animation,
    buttonText: popup.buttonText,
    buttonUrl: popup.buttonUrl,
  };
}

export type CreatePopupInput = {
  title: string;
  message: string;
  color: string | null;
  imageUrl: string | null;
  animation: string | null;
  buttonText: string | null;
  buttonUrl: string | null;
  expiresAt: string | null;
  notifyUsers: boolean;
};
export type CreatePopupResult = { ok: true } | { ok: false; error: string };

export async function createPopupAction(
  initData: string,
  input: CreatePopupInput,
): Promise<CreatePopupResult> {
  try {
    const staff = await requireStaff(initData);

    const title = input.title.trim();
    const message = input.message.trim();
    if (!title) return { ok: false, error: "Title is required" };
    if (!message) return { ok: false, error: "Message is required" };

    await prisma.popup.create({
      data: {
        title,
        message,
        color: input.color?.trim() || null,
        imageUrl: input.imageUrl?.trim() || null,
        animation: input.animation?.trim() || null,
        buttonText: input.buttonText?.trim() || null,
        buttonUrl: input.buttonUrl?.trim() || null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });

    await logAdminAction(staff.id, "popup.create", title);

    if (input.notifyUsers) {
      await broadcastToAllUsers((telegramId) => notifyPromotion(telegramId, title, message));
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to create popup";
    return { ok: false, error: message };
  }
}

export type DeactivatePopupResult = { ok: true } | { ok: false; error: string };

export async function deactivatePopupAction(
  initData: string,
  popupId: string,
): Promise<DeactivatePopupResult> {
  try {
    await requireStaff(initData);
    await prisma.popup.update({ where: { id: popupId }, data: { active: false } });
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to deactivate popup";
    return { ok: false, error: message };
  }
}
