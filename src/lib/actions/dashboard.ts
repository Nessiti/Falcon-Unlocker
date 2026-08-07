"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { OrderStatus, ServiceStatus } from "@/generated/prisma/client";

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

export type DashboardCategory = {
  id: string;
  name: string;
  /** Which catalog most of this category's active services live in - where the shortcut tile should land. */
  href: string;
};

export type DashboardCategoriesResult =
  | { ok: true; categories: DashboardCategory[] }
  | { ok: false; error: string };

const MAX_DASHBOARD_CATEGORIES = 7;

/** Home page category shortcuts: the tenant's busiest categories (by active service count), each linking straight into the catalog it mostly belongs to, pre-filtered. */
export async function getDashboardCategoriesAction(
  initData: string,
): Promise<DashboardCategoriesResult> {
  try {
    const user = await getCurrentUser(initData);

    const categories = await prisma.category.findMany({
      where: { tenantId: user.tenantId },
      include: {
        _count: {
          select: {
            imeiServices: { where: { status: ServiceStatus.ONLINE } },
            serverServices: { where: { status: ServiceStatus.ONLINE } },
          },
        },
      },
    });

    const ranked = categories
      .map((category) => ({
        id: category.id,
        name: category.name,
        imeiCount: category._count.imeiServices,
        serverCount: category._count.serverServices,
      }))
      .filter((category) => category.imeiCount + category.serverCount > 0)
      .sort((a, b) => b.imeiCount + b.serverCount - (a.imeiCount + a.serverCount))
      .slice(0, MAX_DASHBOARD_CATEGORIES)
      .map((category) => ({
        id: category.id,
        name: category.name,
        href: `${category.serverCount > category.imeiCount ? "/server" : "/imei"}?category=${category.id}`,
      }));

    return { ok: true, categories: ranked };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load categories";
    return { ok: false, error: message };
  }
}
