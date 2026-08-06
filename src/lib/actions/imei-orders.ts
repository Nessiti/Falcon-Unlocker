"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { ServiceStatus, WalletTransactionType } from "@/generated/prisma/client";
import { notifyOrderReceived, notifyAdminNewOrder } from "@/lib/telegram/notifications";
import { notifyAllStaff } from "@/lib/telegram/broadcast";
import { resolveFieldValues } from "@/lib/orders";
import { enqueueOrder } from "@/lib/queue/queue-engine";

export type CreateImeiOrderInput = {
  serviceId: string;
  fieldValues: Record<string, string>;
  notes: string | null;
};

export type CreateImeiOrderResult = { ok: true } | { ok: false; error: string };

/** Places an order for an IMEI service, paid from the customer's wallet balance. */
export async function createImeiOrderAction(
  initData: string,
  input: CreateImeiOrderInput,
): Promise<CreateImeiOrderResult> {
  try {
    const user = await getCurrentUser(initData);

    const service = await prisma.imeiService.findUnique({
      where: { id: input.serviceId },
      include: { fields: true },
    });
    if (!service || service.status !== ServiceStatus.ONLINE) {
      return { ok: false, error: "This service is not available" };
    }

    for (const field of service.fields) {
      const value = input.fieldValues[field.id]?.trim();
      if (field.required && !value) {
        return { ok: false, error: `${field.label} is required` };
      }
      if (field.regex && value) {
        try {
          if (!new RegExp(field.regex).test(value)) {
            return { ok: false, error: `${field.label} is not in the expected format` };
          }
        } catch {
          // Malformed admin-configured regex: skip validation rather than break ordering.
        }
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

        const order = await tx.imeiOrder.create({
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
            imeiOrderId: order.id,
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

    await enqueueOrder("IMEI", orderId);
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
