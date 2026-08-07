"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff, requireAdmin } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
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

/** Users section, scoped to the staff member's own tenant (Chapter 38 - this
 * was the one admin section that never got the Chapter 25-31 tenant
 * isolation pass, so every tenant's staff could see every other tenant's
 * customers). */
export async function listUsersAction(initData: string): Promise<ListUsersResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);
    const users = await prisma.user.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" } });

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

/** Suspend / Block / Unblock (Chapter 11 User Management), scoped to the
 * staff member's own tenant (Chapter 38). */
export async function updateUserStatusAction(
  initData: string,
  input: UpdateUserStatusInput,
): Promise<UpdateUserStatusResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const owned = await prisma.user.findFirst({ where: { id: input.userId, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "User not found" };

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

/** Create Admin / Moderator (Chapter 11): promotes/demotes an existing
 * account, scoped to the admin's own tenant (Chapter 38 - without this, any
 * tenant's Admin could reach into another tenant's users, and could even
 * grant itself SUPER_ADMIN). SUPER_ADMIN can never be granted or changed
 * from here - that role has no self-serve path at all, by design. */
export async function updateUserRoleAction(
  initData: string,
  input: UpdateUserRoleInput,
): Promise<UpdateUserRoleResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    if (input.role === Role.SUPER_ADMIN) {
      return { ok: false, error: "Super Admin cannot be granted here" };
    }

    const owned = await prisma.user.findFirst({ where: { id: input.userId, tenantId } });
    if (!owned) return { ok: false, error: "User not found" };
    if (owned.role === Role.SUPER_ADMIN) {
      return { ok: false, error: "Super Admin role cannot be changed here" };
    }

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

/** Modify Balance (Chapter 11 User Management), scoped to the admin's own
 * tenant (Chapter 38). */
export async function adjustUserBalanceAction(
  initData: string,
  input: AdjustBalanceInput,
): Promise<AdjustBalanceResult> {
  try {
    const admin = await requireAdmin(initData);
    const tenantId = requireTenantId(admin);

    if (!Number.isInteger(input.deltaCents) || input.deltaCents === 0) {
      return { ok: false, error: "Enter a non-zero amount" };
    }
    const reason = input.reason.trim() || "Admin adjustment";

    const owned = await prisma.user.findFirst({ where: { id: input.userId, tenantId }, select: { id: true } });
    if (!owned) return { ok: false, error: "User not found" };

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
    await notifyBalanceUpdated(target.telegramId, target.tenantId, target.balanceCents);

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to adjust balance";
    return { ok: false, error: message };
  }
}
