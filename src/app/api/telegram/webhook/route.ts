import { NextResponse, type NextRequest } from "next/server";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/webhook-handler";

/**
 * Telegram Bot webhook: replies to /start with a welcome message. Registered
 * once via Telegram's setWebhook API with a secret token that every genuine
 * update carries in the X-Telegram-Bot-Api-Secret-Token header.
 *
 * This route is Falcon Unlocker's own bot specifically - unchanged since
 * before the multi-tenant work, since Telegram's webhook registration for
 * the live bot already points here. Every other tenant's bot registers its
 * webhook at /api/telegram/webhook/[tenantId] instead (Chapter 33).
 */
export async function POST(request: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = (await request.json()) as TelegramUpdate;
  await handleTelegramUpdate(update);

  return NextResponse.json({ ok: true });
}
