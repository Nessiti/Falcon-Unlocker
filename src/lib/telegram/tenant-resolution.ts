import "server-only";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/security/encryption";

/**
 * Bot -> Tenant detection (multi-tenant foundation, vision chapter 5): there
 * is one shared Mini App URL, but every tenant runs its own Telegram bot.
 * Telegram signs `initData` using the specific bot's own token as the HMAC
 * key, so "which bot launched this Mini App" is answered by finding which
 * tenant's token successfully validates the signature - no other signal is
 * available (a shared static URL carries no server-side session).
 */

export type BotTokenCandidate = { tenantId: string; token: string };

/**
 * Falcon Unlocker's own bot token still lives in TELEGRAM_BOT_TOKEN (env),
 * not Tenant.telegramBotToken - deliberately unmoved since Chapter 24, so
 * the already-running app's bot config is never disturbed by this work.
 */
export async function getTenantBotToken(tenantId: string): Promise<string | null> {
  if (tenantId === "falcon-unlocker") {
    return process.env.TELEGRAM_BOT_TOKEN ?? null;
  }
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { telegramBotToken: true },
  });
  if (!tenant?.telegramBotToken) return null;
  return decryptSecret(tenant.telegramBotToken);
}

/**
 * Every (tenantId, token) pair initData could have been signed with.
 * Falcon's env token always comes first - it's the overwhelmingly common
 * case and a plain env read beats a DB round-trip.
 */
export async function candidateBotTokens(): Promise<BotTokenCandidate[]> {
  const candidates: BotTokenCandidate[] = [];

  const falconToken = process.env.TELEGRAM_BOT_TOKEN;
  if (falconToken) candidates.push({ tenantId: "falcon-unlocker", token: falconToken });

  const tenants = await prisma.tenant.findMany({
    where: { telegramBotToken: { not: null } },
    select: { id: true, telegramBotToken: true },
  });
  for (const tenant of tenants) {
    if (tenant.id === "falcon-unlocker" || !tenant.telegramBotToken) continue;
    candidates.push({ tenantId: tenant.id, token: decryptSecret(tenant.telegramBotToken) });
  }

  return candidates;
}
