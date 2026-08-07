import "server-only";
import { parse, validate } from "@tma.js/init-data-node/web";
import { prisma } from "@/lib/prisma";
import { getTenantBotToken, candidateBotTokens } from "@/lib/telegram/tenant-resolution";

export class TelegramAuthError extends Error {}

async function tryValidate(initData: string, token: string): Promise<boolean> {
  try {
    await validate(initData, token);
    return true;
  } catch {
    return false;
  }
}

export type VerifiedInitData = {
  data: ReturnType<typeof parse>;
  /** Which tenant's bot token signed this initData (Chapter 32: bot -> tenant detection). */
  tenantId: string;
};

/**
 * Verifies the Telegram Mini App `initData` string was signed by one of the
 * platform's known bots, and hasn't expired — and resolves which tenant that
 * bot belongs to. Throws {@link TelegramAuthError} otherwise.
 *
 * Fast path: a returning user's own tenant (looked up from the — as yet
 * unverified — embedded Telegram user id) is tried first, so the overwhelming
 * majority of calls do exactly one indexed lookup and one HMAC check. Slow
 * path (new user, or a stale/rotated token): every known bot token is tried
 * in turn. Peeking at the unverified payload only ever picks which token to
 * verify against — nothing is trusted or acted on until validate() succeeds.
 */
export async function verifyTelegramInitData(initData: string): Promise<VerifiedInitData> {
  if (!initData) {
    throw new TelegramAuthError("Missing initData");
  }

  let peeked: ReturnType<typeof parse>;
  try {
    peeked = parse(initData);
  } catch {
    throw new TelegramAuthError("Malformed Telegram init data");
  }

  if (peeked.user) {
    const existing = await prisma.user.findUnique({
      where: { telegramId: BigInt(peeked.user.id) },
      select: { tenantId: true },
    });
    if (existing?.tenantId) {
      const token = await getTenantBotToken(existing.tenantId);
      if (token && (await tryValidate(initData, token))) {
        return { data: peeked, tenantId: existing.tenantId };
      }
    }
  }

  for (const candidate of await candidateBotTokens()) {
    if (await tryValidate(initData, candidate.token)) {
      return { data: peeked, tenantId: candidate.tenantId };
    }
  }

  throw new TelegramAuthError("Invalid or expired Telegram init data");
}
