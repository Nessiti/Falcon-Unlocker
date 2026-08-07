"use server";

import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/telegram/admin";
import { requireTenantId } from "@/lib/telegram/tenant";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { logAdminAction } from "@/lib/telegram/audit";
import { notifyOrderCompleted, notifyOrderStatusChanged } from "@/lib/telegram/notifications";
import { OrderStatus } from "@/generated/prisma/client";
import { resolveFieldValues } from "@/lib/orders";
import { maybeRewardReferral } from "@/lib/referrals";

export type OrderKind = "IMEI" | "SERVER";

export type AdminOrderSummary = {
  id: string;
  kind: OrderKind;
  status: OrderStatus;
  priceCents: number;
  serviceName: string;
  customerName: string;
  notes: string | null;
  details: { label: string; value: string }[];
  createdAt: string;
};

export type ListAdminOrdersResult =
  | { ok: true; orders: AdminOrderSummary[] }
  | { ok: false; error: string };

export async function listAdminOrdersAction(initData: string): Promise<ListAdminOrdersResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const [imeiOrders, serverOrders] = await Promise.all([
      prisma.imeiOrder.findMany({
        where: { tenantId },
        include: { service: { include: { fields: true } }, user: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.serverOrder.findMany({
        where: { tenantId },
        include: { service: { include: { fields: true } }, user: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const orders: AdminOrderSummary[] = [
      ...imeiOrders.map((order) => ({
        id: order.id,
        kind: "IMEI" as const,
        status: order.status,
        priceCents: order.priceCents,
        serviceName: order.service.name,
        customerName: [order.user.firstName, order.user.lastName].filter(Boolean).join(" "),
        notes: order.notes,
        details: resolveFieldValues(order.fieldValues, order.service.fields),
        createdAt: order.createdAt.toISOString(),
      })),
      ...serverOrders.map((order) => ({
        id: order.id,
        kind: "SERVER" as const,
        status: order.status,
        priceCents: order.priceCents,
        serviceName: order.service.name,
        customerName: [order.user.firstName, order.user.lastName].filter(Boolean).join(" "),
        notes: order.notes,
        details: resolveFieldValues(order.fieldValues, order.service.fields),
        createdAt: order.createdAt.toISOString(),
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return { ok: true, orders };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load orders";
    return { ok: false, error: message };
  }
}

export type UpdateOrderStatusInput = {
  orderId: string;
  kind: OrderKind;
  status: OrderStatus;
  comment: string | null;
};
export type UpdateOrderStatusResult = { ok: true } | { ok: false; error: string };

async function transitionImeiOrder(adminId: string, tenantId: string, input: UpdateOrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.imeiOrder.findFirst({ where: { id: input.orderId, tenantId }, select: { id: true } });
    if (!owned) return null;

    const order = await tx.imeiOrder.update({
      where: { id: input.orderId },
      data: { status: input.status },
      include: { user: true, service: true },
    });
    await tx.imeiOrderStatusEvent.create({
      data: { orderId: order.id, adminId, status: input.status, comment: input.comment },
    });
    return { userId: order.user.id, telegramId: order.user.telegramId, tenantId, serviceName: order.service.name };
  });
}

async function transitionServerOrder(adminId: string, tenantId: string, input: UpdateOrderStatusInput) {
  return prisma.$transaction(async (tx) => {
    const owned = await tx.serverOrder.findFirst({ where: { id: input.orderId, tenantId }, select: { id: true } });
    if (!owned) return null;

    const order = await tx.serverOrder.update({
      where: { id: input.orderId },
      data: { status: input.status },
      include: { user: true, service: true },
    });
    await tx.serverOrderStatusEvent.create({
      data: { orderId: order.id, adminId, status: input.status, comment: input.comment },
    });
    return { userId: order.user.id, telegramId: order.user.telegramId, tenantId, serviceName: order.service.name };
  });
}

/** Order Workflow (Chapter 11): each transition records Date/Admin/Comment and notifies the customer. */
export async function updateOrderStatusAction(
  initData: string,
  input: UpdateOrderStatusInput,
): Promise<UpdateOrderStatusResult> {
  try {
    const staff = await requireStaff(initData);
    const tenantId = requireTenantId(staff);

    const outcome =
      input.kind === "IMEI"
        ? await transitionImeiOrder(staff.id, tenantId, input)
        : await transitionServerOrder(staff.id, tenantId, input);

    if (!outcome) return { ok: false, error: "Order not found" };

    await logAdminAction(staff.id, "order.status", `${input.kind} ${input.orderId} -> ${input.status}`);

    if (input.status === OrderStatus.COMPLETED) {
      await notifyOrderCompleted(outcome.telegramId, outcome.tenantId, outcome.serviceName);
      await maybeRewardReferral(outcome.userId, outcome.tenantId);
    } else if (input.status !== OrderStatus.PENDING) {
      await notifyOrderStatusChanged(outcome.telegramId, outcome.tenantId, outcome.serviceName, input.status);
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to update order";
    return { ok: false, error: message };
  }
}
