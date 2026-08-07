import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantBotToken } from "@/lib/telegram/tenant-resolution";
import { handleTelegramUpdate, type TelegramUpdate } from "@/lib/telegram/webhook-handler";

/**
 * Telegram Bot webhook for any tenant beyond Falcon Unlocker (Chapter 33) —
 * register this exact URL (with the real tenant id) as that bot's webhook
 * via Telegram's setWebhook API. Shares the same TELEGRAM_WEBHOOK_SECRET as
 * every other tenant's bot for now (a deliberate simplification: Telegram
 * lets you pick any secret when registering a webhook, and there's no
 * security reason it must differ per bot — per-tenant secrets can be added
 * later if that's ever actually needed).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const provided = request.headers.get("x-telegram-bot-api-secret-token");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } });
  const token = await getTenantBotToken(tenantId);
  if (!tenant || !token) {
    return NextResponse.json({ error: "Unknown tenant or bot not configured" }, { status: 404 });
  }

  const update = (await request.json()) as TelegramUpdate;
  await handleTelegramUpdate(update, tenantId, tenant.name, token);

  return NextResponse.json({ ok: true });
}
