"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { OrderStatus } from "@/generated/prisma/client";

export type DashboardSummary = {
  pendingOrders: number;
  completedOrders: number;
  rejectedOrders: number;
};

export type DashboardSummaryResult =
  | { ok: true; summary: DashboardSummary }
  | { ok: false; error: string };

const PENDING_STATUSES = [OrderStatus.PENDING, OrderStatus.CHECKING, OrderStatus.PROCESSING];
const REJECTED_STATUSES = [OrderStatus.REJECTED, OrderStatus.CANCELLED];

/** Backs the Chapter 3 Dashboard's order cards with real Chapter 6 order data. */
export async function getDashboardSummaryAction(
  initData: string,
): Promise<DashboardSummaryResult> {
  try {
    const user = await getCurrentUser(initData);

    const [pendingImei, pendingServer, completedImei, completedServer, rejectedImei, rejectedServer] =
      await Promise.all([
        prisma.imeiOrder.count({ where: { userId: user.id, status: { in: PENDING_STATUSES } } }),
        prisma.serverOrder.count({ where: { userId: user.id, status: { in: PENDING_STATUSES } } }),
        prisma.imeiOrder.count({ where: { userId: user.id, status: OrderStatus.COMPLETED } }),
        prisma.serverOrder.count({ where: { userId: user.id, status: OrderStatus.COMPLETED } }),
        prisma.imeiOrder.count({ where: { userId: user.id, status: { in: REJECTED_STATUSES } } }),
        prisma.serverOrder.count({ where: { userId: user.id, status: { in: REJECTED_STATUSES } } }),
      ]);

    return {
      ok: true,
      summary: {
        pendingOrders: pendingImei + pendingServer,
        completedOrders: completedImei + completedServer,
        rejectedOrders: rejectedImei + rejectedServer,
      },
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load dashboard summary";
    return { ok: false, error: message };
  }
}
