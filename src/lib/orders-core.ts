import "server-only";
import { prisma } from "@/lib/prisma";
import { ServiceStatus, WalletTransactionType } from "@/generated/prisma/client";
import { notifyOrderReceived, notifyAdminNewOrder } from "@/lib/telegram/notifications";
import { notifyAllStaff } from "@/lib/telegram/broadcast";
import { resolveFieldValues } from "@/lib/orders";
import { enqueueOrder } from "@/lib/queue/queue-engine";
import { SERVICE_FIELD_RULES, SERVER_FIELD_RULES, validateFieldValue } from "@/lib/validation/field-formats";

export type OrderingUser = {
  id: string;
  tenantId: string;
  telegramId: bigint;
  firstName: string;
  lastName: string | null;
};

export type PlaceOrderInput = {
  serviceId: string;
  fieldValues: Record<string, string>;
  notes: string | null;
};

export type PlaceOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

/**
 * Core IMEI order placement, shared between the Telegram Mini App action
 * (createImeiOrderAction) and the reseller API's placeimeiorder/
 * placebulkorder - the same validation, balance debit, and notifications
 * regardless of which door the order came through.
 */
export async function placeImeiOrder(user: OrderingUser, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const service = await prisma.imeiService.findUnique({
    where: { id: input.serviceId },
    include: { fields: true },
  });
  if (!service || service.status !== ServiceStatus.ONLINE || service.tenantId !== user.tenantId) {
    return { ok: false, error: "This service is not available" };
  }

  for (const field of service.fields) {
    const value = input.fieldValues[field.id] ?? "";
    const result = validateFieldValue(value, {
      label: field.label,
      required: field.required,
      rule: SERVICE_FIELD_RULES[field.type],
      minLength: field.minLength,
      maxLength: field.maxLength,
      regex: field.regex,
    });
    if (!result.ok) return { ok: false, error: result.error };

    if (field.type === "JSON" && value.trim()) {
      try {
        JSON.parse(value);
      } catch {
        return { ok: false, error: `${field.label} must be valid JSON` };
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
      if (count === 0) throw new Error("INSUFFICIENT_BALANCE");

      const order = await tx.imeiOrder.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          priceCents: service.priceCents,
          fieldValues: input.fieldValues,
          notes: input.notes,
          tenantId: service.tenantId,
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
  await notifyOrderReceived(user.telegramId, service.tenantId, service.name, service.priceCents);

  const customerName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const details = resolveFieldValues(input.fieldValues, service.fields);
  if (input.notes?.trim()) details.push({ label: "Notes", value: input.notes.trim() });
  await notifyAllStaff(service.tenantId, (telegramId) =>
    notifyAdminNewOrder(telegramId, service.tenantId, customerName, service.name, service.priceCents, details),
  );

  return { ok: true, orderId };
}

/** Core Server order placement - see placeImeiOrder for the shared shape and reasoning. */
export async function placeServerOrder(user: OrderingUser, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const service = await prisma.serverService.findUnique({
    where: { id: input.serviceId },
    include: { fields: true },
  });
  if (!service || service.status !== ServiceStatus.ONLINE || service.tenantId !== user.tenantId) {
    return { ok: false, error: "This service is not available" };
  }

  for (const field of service.fields) {
    const result = validateFieldValue(input.fieldValues[field.id] ?? "", {
      label: field.label,
      required: field.required,
      rule: SERVER_FIELD_RULES[field.type],
      minLength: field.minLength,
      maxLength: field.maxLength,
    });
    if (!result.ok) return { ok: false, error: result.error };
  }

  let orderId: string;
  try {
    orderId = await prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id: user.id, balanceCents: { gte: service.priceCents } },
        data: { balanceCents: { decrement: service.priceCents } },
      });
      if (count === 0) throw new Error("INSUFFICIENT_BALANCE");

      const order = await tx.serverOrder.create({
        data: {
          userId: user.id,
          serviceId: service.id,
          priceCents: service.priceCents,
          fieldValues: input.fieldValues,
          notes: input.notes,
          tenantId: service.tenantId,
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
  await notifyOrderReceived(user.telegramId, service.tenantId, service.name, service.priceCents);

  const customerName = [user.firstName, user.lastName].filter(Boolean).join(" ");
  const details = resolveFieldValues(input.fieldValues, service.fields);
  if (input.notes?.trim()) details.push({ label: "Notes", value: input.notes.trim() });
  await notifyAllStaff(service.tenantId, (telegramId) =>
    notifyAdminNewOrder(telegramId, service.tenantId, customerName, service.name, service.priceCents, details),
  );

  return { ok: true, orderId };
}
