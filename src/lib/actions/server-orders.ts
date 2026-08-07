"use server";

import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { placeServerOrder } from "@/lib/orders-core";

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
    const result = await placeServerOrder(user, input);
    return result.ok ? { ok: true } : result;
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Failed to place order";
    return { ok: false, error: message };
  }
}
