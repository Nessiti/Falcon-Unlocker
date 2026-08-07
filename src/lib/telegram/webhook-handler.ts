import "server-only";
import { notifyWelcome } from "@/lib/telegram/notifications";

export type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { first_name: string };
  };
};

/**
 * Shared /start handling for both the legacy Falcon-only webhook route and
 * the per-tenant one (Chapter 33) - replies as the given brand's own bot
 * (tenantId/tenantName/token default to Falcon Unlocker's, so the original
 * route's behavior is unchanged).
 */
export async function handleTelegramUpdate(
  update: TelegramUpdate,
  tenantId = "falcon-unlocker",
  tenantName?: string,
  token?: string,
): Promise<void> {
  const message = update.message;
  if (message?.text?.trim() === "/start") {
    await notifyWelcome(
      BigInt(message.chat.id),
      tenantId,
      message.from?.first_name ?? "there",
      tenantName,
      token,
    );
  }
}
