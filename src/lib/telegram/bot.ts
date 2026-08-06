import "server-only";

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
 * with native Telegram buttons opening the Mini App). Never throws — a
 * notification failure must not break the action that triggered it.
 */
export async function sendTelegramMessage(
  telegramId: bigint | number | string,
  text: string,
  buttons?: TelegramInlineButton[],
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
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
 * unset, network/API error, or the bot isn't in that channel) — callers
 * should treat null as "unknown" and fail open rather than hide content.
 */
export async function isChannelMember(
  channel: string,
  telegramId: bigint | number | string,
): Promise<boolean | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
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
