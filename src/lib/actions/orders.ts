"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { resolveFieldValues } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma/client";

export type OrderStatusHistoryEntry = {
  status: OrderStatus;
  comment: string | null;
  createdAt: string;
};

export type OrderSummary = {
  id: string;
  kind: "IMEI" | "SERVER";
  status: OrderStatus;
  priceCents: number;
  serviceName: string;
  tracking: string | null;
  notes: string | null;
  downloadUrl: string | null;
  createdAt: string;
  /** Submitted values for the service's custom fields, joined to their labels. */
  fields: { label: string; value: string }[];
  /** Order Workflow (Chapter 11): Date/Comment per status transition. */
  statusHistory: OrderStatusHistoryEntry[];
};

export type ListMyOrdersResult =
  | { ok: true; imei: OrderSummary[]; server: OrderSummary[] }
  | { ok: false; error: string };

/** The two order histories (Chapter 6): IMEI Orders and Server Orders. */
export async function listMyOrdersAction(initData: string): Promise<ListMyOrdersResult> {
  try {
    const user = await getCurrentUser(initData);

    const [imeiOrders, serverOrders] = await Promise.all([
      prisma.imeiOrder.findMany({
        where: { userId: user.id },
        include: {
          service: { include: { fields: true } },
          statusEvents: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.serverOrder.findMany({
        where: { userId: user.id },
        include: {
          service: { include: { fields: true } },
          statusEvents: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const toSummary = (
      kind: "IMEI" | "SERVER",
      order: {
        id: string;
        status: OrderStatus;
        priceCents: number;
        service: { name: string; fields: { id: string; label: string }[] };
        fieldValues: unknown;
        tracking: string | null;
        notes: string | null;
        downloadUrl: string | null;
        createdAt: Date;
        statusEvents: { status: OrderStatus; comment: string | null; createdAt: Date }[];
      },
    ): OrderSummary => ({
      id: order.id,
      kind,
      status: order.status,
      priceCents: order.priceCents,
      serviceName: order.service.name,
      tracking: order.tracking,
      notes: order.notes,
      downloadUrl: order.downloadUrl,
      createdAt: order.createdAt.toISOString(),
      fields: resolveFieldValues(order.fieldValues, order.service.fields),
      statusHistory: order.statusEvents.map((event) => ({
        status: event.status,
        comment: event.comment,
        createdAt: event.createdAt.toISOString(),
      })),
    });

    return {
      ok: true,
      imei: imeiOrders.map((order) => toSummary("IMEI", order)),
      server: serverOrders.map((order) => toSummary("SERVER", order)),
    };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to load order history";
    return { ok: false, error: message };
  }
}
