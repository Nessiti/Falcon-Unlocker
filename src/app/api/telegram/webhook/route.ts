import { NextResponse, type NextRequest } from "next/server";
import { notifyWelcome } from "@/lib/telegram/notifications";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat: { id: number };
    from?: { first_name: string };
  };
};

/**
 * Telegram Bot webhook: replies to /start with a welcome message. Registered
 * once via Telegram's setWebhook API with a secret token that every genuine
 * update carries in the X-Telegram-Bot-Api-Secret-Token header.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  const message = update.message;

  if (message?.text?.trim() === "/start") {
    await notifyWelcome(BigInt(message.chat.id), message.from?.first_name ?? "there");
  }

  return NextResponse.json({ ok: true });
}
