"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { OrderStatus, RechargeStatus, TicketStatus } from "@/generated/prisma/client";

const IN_FLIGHT_STATUSES = [OrderStatus.PENDING, OrderStatus.CHECKING, OrderStatus.PROCESSING];

export type AdminDashboardStats = {
  totalUsers: number;
  pendingOrders: number;
  completedOrders: number;
  revenueCents: number;
  pendingRecharges: number;
  openTickets: number;
};

export type GetAdminDashboardResult =
  | { ok: true; stats: AdminDashboardStats }
  | { ok: false; error: string };

/** Scoped to the staff member's own tenant (Chapter 30) - previously aggregated every tenant's numbers together. */
export async function getAdminDashboardAction(initData: string): Promise<GetAdminDashboardResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const [
      totalUsers,
      pendingImei,
      pendingServer,
      completedImei,
      completedServer,
      revenueImei,
      revenueServer,
      pendingRecharges,
      openTickets,
    ] = await Promise.all([
      prisma.user.count({ where: { tenantId } }),
      prisma.imeiOrder.count({ where: { tenantId, status: { in: IN_FLIGHT_STATUSES } } }),
      prisma.serverOrder.count({ where: { tenantId, status: { in: IN_FLIGHT_STATUSES } } }),
      prisma.imeiOrder.count({ where: { tenantId, status: OrderStatus.COMPLETED } }),
      prisma.serverOrder.count({ where: { tenantId, status: OrderStatus.COMPLETED } }),
      prisma.imeiOrder.aggregate({
        where: { tenantId, status: OrderStatus.COMPLETED },
        _sum: { priceCents: true },
      }),
      prisma.serverOrder.aggregate({
        where: { tenantId, status: OrderStatus.COMPLETED },
        _sum: { priceCents: true },
      }),
      prisma.rechargeOrder.count({ where: { tenantId, status: RechargeStatus.PENDING } }),
      prisma.supportTicket.count({ where: { status: { not: TicketStatus.CLOSED }, user: { tenantId } } }),
    ]);

    return {
      ok: true,
      stats: {
        totalUsers,
        pendingOrders: pendingImei + pendingServer,
        completedOrders: completedImei + completedServer,
        revenueCents: (revenueImei._sum.priceCents ?? 0) + (revenueServer._sum.priceCents ?? 0),
        pendingRecharges,
        openTickets,
      },
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load dashboard";
    return { ok: false, error: message };
  }
}

export type AdminStatistics = {
  usersByRole: { role: string; count: number }[];
  imeiOrdersByStatus: { status: string; count: number }[];
  serverOrdersByStatus: { status: string; count: number }[];
  totalRevenueCents: number;
  totalWalletCreditedCents: number;
};

export type GetAdminStatisticsResult =
  | { ok: true; stats: AdminStatistics }
  | { ok: false; error: string };

/** Scoped to the staff member's own tenant (Chapter 30) - previously aggregated every tenant's numbers together. */
export async function getAdminStatisticsAction(
  initData: string,
): Promise<GetAdminStatisticsResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const [usersByRole, imeiByStatus, serverByStatus, revenueImei, revenueServer, credits] =
      await Promise.all([
        prisma.user.groupBy({ by: ["role"], where: { tenantId }, _count: { _all: true } }),
        prisma.imeiOrder.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
        prisma.serverOrder.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
        prisma.imeiOrder.aggregate({
          where: { tenantId, status: OrderStatus.COMPLETED },
          _sum: { priceCents: true },
        }),
        prisma.serverOrder.aggregate({
          where: { tenantId, status: OrderStatus.COMPLETED },
          _sum: { priceCents: true },
        }),
        prisma.walletTransaction.aggregate({
          where: { type: "CREDIT", user: { tenantId } },
          _sum: { amountCents: true },
        }),
      ]);

    return {
      ok: true,
      stats: {
        usersByRole: usersByRole.map((row) => ({ role: row.role, count: row._count._all })),
        imeiOrdersByStatus: imeiByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        serverOrdersByStatus: serverByStatus.map((row) => ({
          status: row.status,
          count: row._count._all,
        })),
        totalRevenueCents: (revenueImei._sum.priceCents ?? 0) + (revenueServer._sum.priceCents ?? 0),
        totalWalletCreditedCents: credits._sum.amountCents ?? 0,
      },
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load statistics";
    return { ok: false, error: message };
  }
}
