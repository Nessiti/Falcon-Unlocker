"use server";

import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { placeImeiOrder } from "@/lib/orders-core";

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
    const result = await placeImeiOrder(user, input);
    return result.ok ? { ok: true } : result;
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to place order";
    return { ok: false, error: message };
  }
}
