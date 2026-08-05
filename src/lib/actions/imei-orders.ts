"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { ServiceStatus } from "@/generated/prisma/client";

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
      if (field.required && !input.fieldValues[field.id]?.trim()) {
        return { ok: false, error: `${field.label} is required` };
      }
    }

    try {
      await prisma.$transaction(async (tx) => {
        const { count } = await tx.user.updateMany({
          where: { id: user.id, balanceCents: { gte: service.priceCents } },
          data: { balanceCents: { decrement: service.priceCents } },
        });
        if (count === 0) {
          throw new Error("INSUFFICIENT_BALANCE");
        }

        await tx.imeiOrder.create({
          data: {
            userId: user.id,
            serviceId: service.id,
            priceCents: service.priceCents,
            fieldValues: input.fieldValues,
            notes: input.notes,
          },
        });
      });
    } catch (error) {
      if (error instanceof Error && error.message === "INSUFFICIENT_BALANCE") {
        return { ok: false, error: "Insufficient balance. Recharge your wallet." };
      }
      throw error;
    }

    return { ok: true };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to place order";
    return { ok: false, error: message };
  }
}
