"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { notifyPromotion } from "@/lib/telegram/notifications";
import { broadcastToAllUsers } from "@/lib/telegram/broadcast";
import { isChannelMember } from "@/lib/telegram/bot";
import { getCurrentUser } from "@/lib/telegram/current-user";

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

/**
 * The active, not-yet-expired popup to show customers (Chapter 11: Popup),
 * scoped to the caller's own tenant (Chapter 34) - resolved from initData
 * when present (every call site is a client component that already has it,
 * unlike listFaqAction/listNewsAction's server-rendered pages), falling
 * back to Falcon Unlocker's tenant when it's missing or fails to verify, so
 * existing anonymous/admin-preview call sites keep working.
 *
 * When the popup has a requiredChannel set, it's skipped for users who
 * already belong to that channel (fails open: shown when membership can't
 * be verified, e.g. no resolved user at all).
 */
export async function getActivePopupAction(initData?: string | null): Promise<PopupSummary | null> {
  let tenantId = "falcon-unlocker";
  let currentUser: Awaited<ReturnType<typeof getCurrentUser>> | null = null;
  if (initData) {
    try {
      currentUser = await getCurrentUser(initData);
      if (currentUser.tenantId) tenantId = currentUser.tenantId;
    } catch {
      // Couldn't resolve the user - fall back to Falcon Unlocker's tenant.
    }
  }

  const popup = await prisma.popup.findFirst({
    where: {
      tenantId,
      active: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!popup) return null;

  if (popup.requiredChannel && currentUser) {
    try {
      const isMember = await isChannelMember(popup.requiredChannel, currentUser.telegramId, tenantId);
      if (isMember) return null;
    } catch {
      // Couldn't check membership - fail open.
    }
  }

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
  /** Skip this popup for users already in this channel (@username or chat id). */
  requiredChannel: string | null;
};
export type CreatePopupResult = { ok: true } | { ok: false; error: string };

export async function createPopupAction(
  initData: string,
  input: CreatePopupInput,
): Promise<CreatePopupResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

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
        requiredChannel: input.requiredChannel?.trim() || null,
        tenantId,
      },
    });

    await logAdminAction(staff.id, "popup.create", title);

    if (input.notifyUsers) {
      await broadcastToAllUsers(tenantId, (telegramId) => notifyPromotion(telegramId, tenantId, title, message));
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
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const { count } = await prisma.popup.updateMany({
      where: { id: popupId, tenantId },
      data: { active: false },
    });
    if (count === 0) return { ok: false, error: "Popup not found" };
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to deactivate popup";
    return { ok: false, error: message };
  }
}
