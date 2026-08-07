import "server-only";
import { sendTelegramMessage } from "@/lib/telegram/bot";
import { prisma } from "@/lib/prisma";
import { formatUsd } from "@/lib/ui";

/** The 8 notification types from Chapter 9, all sent via the Telegram Bot with native buttons. */

export function notifyOrderReceived(
  telegramId: bigint,
  tenantId: string,
  serviceName: string,
  priceCents: number,
) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `🧾 <b>Order received</b>\n${serviceName} - ${formatUsd(priceCents)}\nWe'll notify you once it's processed.`,
    [{ text: "View Order", path: "/orders" }],
  );
}

/** Alerts staff (Admin/Moderator) of a new order, with the customer's submitted details. */
export function notifyAdminNewOrder(
  telegramId: bigint,
  tenantId: string,
  customerName: string,
  serviceName: string,
  priceCents: number,
  details: { label: string; value: string }[],
) {
  const detailLines = details.map((detail) => `• ${detail.label}: ${detail.value}`).join("\n");
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `🆕 <b>New order</b>\n${customerName} - ${serviceName} (${formatUsd(priceCents)})${detailLines ? `\n${detailLines}` : ""}`,
    [{ text: "Open Admin Orders", path: "/admin/orders" }],
  );
}

export function notifyPaymentAccepted(telegramId: bigint, tenantId: string, amountCents: number) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `✅ <b>Payment accepted</b>\n${formatUsd(amountCents)} has been added to your wallet.`,
    [{ text: "View Wallet", path: "/wallet" }],
  );
}

export function notifyPaymentRejected(telegramId: bigint, tenantId: string, amountCents: number) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `❌ <b>Payment rejected</b>\nYour recharge request for ${formatUsd(amountCents)} was rejected. Contact support if this seems wrong.`,
    [{ text: "Contact Support", path: "/support" }],
  );
}

export function notifyOrderCompleted(telegramId: bigint, tenantId: string, serviceName: string) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `🎉 <b>Order completed</b>\n${serviceName} is ready.`,
    [{ text: "View Order", path: "/orders" }],
  );
}

const STATUS_LABEL: Record<string, string> = {
  CHECKING: "being checked",
  PROCESSING: "being processed",
  REJECTED: "rejected",
  CANCELLED: "cancelled",
};

/** Order Workflow (Chapter 11): notifies non-Completed status transitions. */
export function notifyOrderStatusChanged(
  telegramId: bigint,
  tenantId: string,
  serviceName: string,
  status: string,
) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `📦 <b>Order update</b>\n${serviceName} is now ${STATUS_LABEL[status] ?? status.toLowerCase()}.`,
    [{ text: "View Order", path: "/orders" }],
  );
}

export function notifyPromotion(telegramId: bigint, tenantId: string, title: string, message: string) {
  return sendTelegramMessage(telegramId, tenantId, `🎁 <b>${title}</b>\n${message}`, [
    { text: "Open App", path: "/" },
  ]);
}

export function notifyMaintenance(telegramId: bigint, tenantId: string, message: string) {
  return sendTelegramMessage(telegramId, tenantId, `🛠 <b>Maintenance</b>\n${message}`);
}

export function notifyBalanceUpdated(telegramId: bigint, tenantId: string, balanceCents: number) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `💰 <b>Balance updated</b>\nYour new balance is ${formatUsd(balanceCents)}.`,
    [{ text: "View Wallet", path: "/wallet" }],
  );
}

/**
 * `tenantName`/`token` let the webhook route (Chapter 33) reply as the
 * correct brand for a first-ever /start, before any User row exists to
 * resolve a tenant from automatically. `tenantId` still has to be passed
 * (Chapter 37 made it a required part of every outbound send) but is only
 * ever used as a fallback if `token` isn't supplied - the per-tenant
 * webhook route always knows its own tenantId, and the legacy static route
 * defaults to Falcon Unlocker's.
 */
export async function notifyWelcome(
  telegramId: bigint,
  tenantId: string,
  firstName: string,
  tenantName = "Falcon Unlocker",
  token?: string,
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { welcomeMessage: true } });
  const text = tenant?.welcomeMessage
    ? tenant.welcomeMessage.replace(/\{firstName\}/g, firstName)
    : `👋 <b>Welcome, ${firstName}!</b>\n${tenantName} is the first Telegram-native GSM Server. Open the app to unlock IMEI/server services, manage your wallet, and track your orders.`;

  return sendTelegramMessage(telegramId, tenantId, text, [{ text: "Open App", path: "/" }], token);
}

/**
 * One-time nudge (loginAction, guarded by Tenant.welcomeOnboardingSentAt) so
 * a brand-new tenant's owner knows their bot is sending customers generic
 * default copy until they write their own - links straight to the Admin
 * Settings field that sets it.
 */
export function notifyCustomizeWelcomeMessage(telegramId: bigint, tenantId: string, firstName: string) {
  return sendTelegramMessage(
    telegramId,
    tenantId,
    `👋 <b>Welcome, ${firstName}!</b>\nYour bot is currently sending new customers a generic default welcome message. Write your own to match your brand - tap below to set it.`,
    [{ text: "Write Welcome Message", path: "/admin/settings#welcome-message" }],
  );
}

export function notifySupportReply(telegramId: bigint, tenantId: string, message: string) {
  return sendTelegramMessage(telegramId, tenantId, `💬 <b>Support reply</b>\n${message}`, [
    { text: "Open Support", path: "/support" },
  ]);
}
