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
 * Fast path: the same Telegram person can hold a separate account in more
 * than one tenant (Chapter 37), so the — as yet unverified — embedded
 * Telegram user id is used to look up every tenant this person already has
 * an account in, and each is tried in turn; this is still cheap (a handful
 * of rows at most) and covers the overwhelming majority of calls. Slow path
 * (brand-new person, or a stale/rotated token): every known bot token is
 * tried instead. Peeking at the unverified payload only ever picks which
 * token to verify against — nothing is trusted or acted on until validate()
 * succeeds.
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
    const existingAccounts = await prisma.user.findMany({
      where: { telegramId: BigInt(peeked.user.id) },
      select: { tenantId: true },
    });
    for (const { tenantId } of existingAccounts) {
      const token = await getTenantBotToken(tenantId);
      if (token && (await tryValidate(initData, token))) {
        return { data: peeked, tenantId };
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
