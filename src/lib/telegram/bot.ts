import "server-only";
import { getTenantBotToken } from "@/lib/telegram/tenant-resolution";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type TelegramInlineButton = {
  text: string;
  /** Path within the Mini App (resolved against NEXT_PUBLIC_APP_URL) that the button opens. */
  path: string;
};

function buildReplyMarkup(buttons: TelegramInlineButton[] | undefined) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!buttons || buttons.length === 0 || !appUrl) return undefined;

  return {
    inline_keyboard: buttons.map((button) => [
      { text: button.text, web_app: { url: new URL(button.path, appUrl).toString() } },
    ]),
  };
}

/**
 * Sends a Telegram Bot message to a user (Chapter 9: 100% via Telegram Bot,
 * with native Telegram buttons opening the Mini App). Never throws - a
 * notification failure must not break the action that triggered it.
 *
 * `tenantId` picks which brand's bot sends the message - callers always
 * already know it (it's the tenant of the order/ticket/user the
 * notification is about), so it's taken directly rather than re-derived
 * from `telegramId` (Chapter 37: the same Telegram person can hold a
 * separate account in more than one tenant, so telegramId alone is no
 * longer enough to say which bot should be speaking). `tokenOverride` is
 * for the one context with no resolvable tenant yet - the webhook route
 * replying to a first-ever /start.
 */
export async function sendTelegramMessage(
  telegramId: bigint | number | string,
  tenantId: string,
  text: string,
  buttons?: TelegramInlineButton[],
  tokenOverride?: string,
): Promise<void> {
  const token = tokenOverride ?? (await getTenantBotToken(tenantId));
  if (!token) return;

  try {
    await fetch(`${TELEGRAM_API_BASE}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramId.toString(),
        text,
        parse_mode: "HTML",
        reply_markup: buildReplyMarkup(buttons),
      }),
    });
  } catch (error) {
    console.error("[telegram] failed to send notification", error);
  }
}

const CHANNEL_MEMBER_STATUSES = new Set(["creator", "administrator", "member", "restricted"]);

/**
 * Checks whether a user already belongs to a Telegram channel/chat, via the
 * Bot API's getChatMember (the bot must be a member of that channel).
 * Returns null when membership can't be determined (no bot token, channel
 * unset, network/API error, or the bot isn't in that channel) - callers
 * should treat null as "unknown" and fail open rather than hide content.
 * Takes `tenantId` directly for the same reason sendTelegramMessage does -
 * a channel gate only makes sense checked against the same bot the
 * customer is actually using, and that's no longer derivable from
 * telegramId alone (Chapter 37).
 */
export async function isChannelMember(
  channel: string,
  telegramId: bigint | number | string,
  tenantId: string,
): Promise<boolean | null> {
  const token = await getTenantBotToken(tenantId);
  if (!token || !channel.trim()) return null;

  try {
    const url = new URL(`${TELEGRAM_API_BASE}/bot${token}/getChatMember`);
    url.searchParams.set("chat_id", channel.trim());
    url.searchParams.set("user_id", telegramId.toString());

    const response = await fetch(url);
    const data = await response.json();
    if (!data.ok) return null;

    return CHANNEL_MEMBER_STATUSES.has(data.result?.status);
  } catch (error) {
    console.error("[telegram] failed to check channel membership", error);
    return null;
  }
}
