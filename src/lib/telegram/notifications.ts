import "server-only";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { formatUsd } from "@/lib/ui";

/** The 8 notification types from Chapter 9, all sent via the Telegram Bot with native buttons. */

export function notifyOrderReceived(telegramId: bigint, serviceName: string, priceCents: number) {
  return sendTelegramMessage(
    telegramId,
    `🧾 <b>Order received</b>\n${serviceName} — ${formatUsd(priceCents)}\nWe'll notify you once it's processed.`,
    [{ text: "View Order", path: "/orders" }],
  );
}

/** Alerts staff (Admin/Moderator) of a new order, with the customer's submitted details. */
export function notifyAdminNewOrder(
  telegramId: bigint,
  customerName: string,
  serviceName: string,
  priceCents: number,
  details: { label: string; value: string }[],
) {
  const detailLines = details.map((detail) => `• ${detail.label}: ${detail.value}`).join("\n");
  return sendTelegramMessage(
    telegramId,
    `🆕 <b>New order</b>\n${customerName} — ${serviceName} (${formatUsd(priceCents)})${detailLines ? `\n${detailLines}` : ""}`,
    [{ text: "Open Admin Orders", path: "/admin/orders" }],
  );
}

export function notifyPaymentAccepted(telegramId: bigint, amountCents: number) {
  return sendTelegramMessage(
    telegramId,
    `✅ <b>Payment accepted</b>\n${formatUsd(amountCents)} has been added to your wallet.`,
    [{ text: "View Wallet", path: "/wallet" }],
  );
}

export function notifyPaymentRejected(telegramId: bigint, amountCents: number) {
  return sendTelegramMessage(
    telegramId,
    `❌ <b>Payment rejected</b>\nYour recharge request for ${formatUsd(amountCents)} was rejected. Contact support if this seems wrong.`,
    [{ text: "Contact Support", path: "/support" }],
  );
}

export function notifyOrderCompleted(telegramId: bigint, serviceName: string) {
  return sendTelegramMessage(telegramId, `🎉 <b>Order completed</b>\n${serviceName} is ready.`, [
    { text: "View Order", path: "/orders" },
  ]);
}

const STATUS_LABEL: Record<string, string> = {
  CHECKING: "being checked",
  PROCESSING: "being processed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

/** Order Workflow (Chapter 11): notifies non-Completed status transitions. */
export function notifyOrderStatusChanged(telegramId: bigint, serviceName: string, status: string) {
  return sendTelegramMessage(
    telegramId,
    `📦 <b>Order update</b>\n${serviceName} is now ${STATUS_LABEL[status] ?? status.toLowerCase()}.`,
    [{ text: "View Order", path: "/orders" }],
  );
}

export function notifyPromotion(telegramId: bigint, title: string, message: string) {
  return sendTelegramMessage(telegramId, `🎁 <b>${title}</b>\n${message}`, [
    { text: "Open App", path: "/" },
  ]);
}

export function notifyMaintenance(telegramId: bigint, message: string) {
  return sendTelegramMessage(telegramId, `🛠 <b>Maintenance</b>\n${message}`);
}

export function notifyBalanceUpdated(telegramId: bigint, balanceCents: number) {
  return sendTelegramMessage(
    telegramId,
    `💰 <b>Balance updated</b>\nYour new balance is ${formatUsd(balanceCents)}.`,
    [{ text: "View Wallet", path: "/wallet" }],
  );
}

/**
 * `tenantName`/`token` let the webhook route (Chapter 33) reply as the
 * correct brand for a first-ever /start, before any User row exists to
 * resolve a tenant from automatically — every other caller keeps working
 * unchanged (defaults to Falcon Unlocker's own copy and bot).
 */
export function notifyWelcome(
  telegramId: bigint,
  firstName: string,
  tenantName = "Falcon Unlocker",
  token?: string,
) {
  return sendTelegramMessage(
    telegramId,
    `👋 <b>Welcome, ${firstName}!</b>\n${tenantName} is the first Telegram-native GSM Server. Open the app to unlock IMEI/server services, manage your wallet, and track your orders.`,
    [{ text: "Open App", path: "/" }],
    token,
  );
}

export function notifySupportReply(telegramId: bigint, message: string) {
  return sendTelegramMessage(telegramId, `💬 <b>Support reply</b>\n${message}`, [
    { text: "Open Support", path: "/support" },
  ]);
}
