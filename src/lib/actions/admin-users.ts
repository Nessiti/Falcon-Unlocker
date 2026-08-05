"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { notifyBalanceUpdated } from "@/lib/telegram/notifications";
import { Role, UserStatus, WalletTransactionType } from "@/generated/prisma/client";

export type AdminUserSummary = {
  id: string;
  telegramId: string;
  firstName: string;
  lastName: string | null;
  username: string | null;
  role: Role;
  status: UserStatus;
  balanceCents: number;
  createdAt: string;
};

export type ListUsersResult = { ok: true; users: AdminUserSummary[] } | { ok: false; error: string };

export async function listUsersAction(initData: string): Promise<ListUsersResult> {
  try {
    await requireStaff(initData);
    const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });

    return {
      ok: true,
      users: users.map((user) => ({
        id: user.id,
        telegramId: user.telegramId.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        status: user.status,
        balanceCents: user.balanceCents,
        createdAt: user.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load users";
    return { ok: false, error: message };
  }
}

export type UpdateUserStatusInput = { userId: string; status: UserStatus };
export type UpdateUserStatusResult = { ok: true } | { ok: false; error: string };

/** Suspend / Block / Unblock (Chapter 11 User Management). */
export async function updateUserStatusAction(
  initData: string,
  input: UpdateUserStatusInput,
): Promise<UpdateUserStatusResult> {
  try {
    const staff = await requireStaff(initData);
    const target = await prisma.user.update({
      where: { id: input.userId },
      data: { status: input.status },
    });
    await logAdminAction(staff.id, "user.status", `${target.firstName} -> ${input.status}`);
    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to update status";
    return { ok: false, error: message };
  }
}

export type UpdateUserRoleInput = { userId: string; role: Role };
export type UpdateUserRoleResult = { ok: true } | { ok: false; error: string };

/** Create Admin / Moderator (Chapter 11): promotes/demotes an existing account. Admin-only. */
export async function updateUserRoleAction(
  initData: string,
  input: UpdateUserRoleInput,
): Promise<UpdateUserRoleResult> {
  try {
    const admin = await requireAdmin(initData);
    const target = await prisma.user.update({
      where: { id: input.userId },
      data: { role: input.role },
    });
    await logAdminAction(admin.id, "user.role", `${target.firstName} -> ${input.role}`);
    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update role";
    return { ok: false, error: message };
  }
}

export type AdjustBalanceInput = { userId: string; deltaCents: number; reason: string };
export type AdjustBalanceResult = { ok: true } | { ok: false; error: string };

/** Modify Balance (Chapter 11 User Management). Admin-only. */
export async function adjustUserBalanceAction(
  initData: string,
  input: AdjustBalanceInput,
): Promise<AdjustBalanceResult> {
  try {
    const admin = await requireAdmin(initData);

    if (!Number.isInteger(input.deltaCents) || input.deltaCents === 0) {
      return { ok: false, error: "Enter a non-zero amount" };
    }
    const reason = input.reason.trim() || "Admin adjustment";

    const target = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: input.userId },
        data: { balanceCents: { increment: input.deltaCents } },
      });

      await tx.walletTransaction.create({
        data: {
          userId: updated.id,
          type: input.deltaCents > 0 ? WalletTransactionType.CREDIT : WalletTransactionType.DEBIT,
          amountCents: Math.abs(input.deltaCents),
          reason,
        },
      });

      return updated;
    });

    await logAdminAction(
      admin.id,
      "user.balance",
      `${target.firstName}: ${input.deltaCents} cents (${reason})`,
    );
    await notifyBalanceUpdated(target.telegramId, target.balanceCents);

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to adjust balance";
    return { ok: false, error: message };
  }
}
