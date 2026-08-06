"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { ServiceStatus, WalletTransactionType } from "@/generated/prisma/client";
import { notifyOrderReceived, notifyAdminNewOrder } from "@/lib/telegram/notifications";
import { notifyAllStaff } from "@/lib/telegram/broadcast";
import { resolveFieldValues } from "@/lib/orders";
import { enqueueOrder } from "@/lib/queue/queue-engine";

export type CreateServerOrderInput = {
  serviceId: string;
  fieldValues: Record<string, string>;
  notes: string | null;
};

export type CreateServerOrderResult = { ok: true } | { ok: false; error: string };

/** Places an order for a Server service, paid from the customer's wallet balance. */
export async function createServerOrderAction(
  initData: string,
  input: CreateServerOrderInput,
): Promise<CreateServerOrderResult> {
  try {
    const user = await getCurrentUser(initData);

    const service = await prisma.serverService.findUnique({
      where: { id: input.serviceId },
      include: { fields: true },
    });
    if (!service || service.status !== ServiceStatus.ONLINE) {
      return { ok: false, error: "This service is not available" };
    }

    for (const field of service.fields) {
      if (field.required && !input.fieldValues[field.id]?.trim()) {
        return { ok: false, error: `${field.label} is required` };
      }
    }

    let orderId: string;
    try {
      orderId = await prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: { id: user.id, balanceCents: { gte: service.priceCents } },
          data: { balanceCents: { decrement: service.priceCents } },
        });
        if (count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        const order = await tx.serverOrder.create({
          data: {
            userId: user.id,
            serviceId: service.id,
            priceCents: service.priceCents,
            fieldValues: input.fieldValues,
            notes: input.notes,
          },
        });

        await tx.walletTransaction.create({
          data: {
            userId: user.id,
            type: WalletTransactionType.DEBIT,
            amountCents: service.priceCents,
            reason: `Order: ${service.name}`,
            serverOrderId: order.id,
          },
        });

        return order.id;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return { ok: false, error: "Insufficient balance. Recharge your wallet." };
      }
      throw error;
    }

    await enqueueOrder("SERVER", orderId);
    await notifyOrderReceived(user.telegramId, service.name, service.priceCents);

    const customerName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    const details = resolveFieldValues(input.fieldValues, service.fields);
    if (input.notes?.trim()) details.push({ label: "Notes", value: input.notes.trim() });
    await notifyAllStaff((telegramId) =>
      notifyAdminNewOrder(telegramId, customerName, service.name, service.priceCents, details),
    );

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to place order";
    return { ok: false, error: message };
  }
}
