import "server-only";
import { prisma } from "@/lib/prisma";
import { WalletTransactionType } from "@/generated/prisma/client";
import { notifyBalanceUpdated } from "@/lib/telegram/notifications";

/** One-time bonus credited to the referrer once their invitee's first order completes. */
export const REFERRAL_BONUS_CENTS = 500;

const REFERRAL_PREFIX = "ref_";

export function buildReferralStartParam(userId: string): string {
  return `${REFERRAL_PREFIX}${userId}`;
}

function parseReferrerId(startParam: string): string | null {
  if (!startParam.startsWith(REFERRAL_PREFIX)) return null;
  const id = startParam.slice(REFERRAL_PREFIX.length).trim();
  return id.length > 0 ? id : null;
}

/**
 * Captures a referral click at bot /start time - before the clicker even
 * has a User row in this tenant, so it can't be attached to them directly
 * yet. Stored keyed by (telegramId, tenantId) and consumed the moment that
 * account is actually created (see consumePendingReferral in loginAction).
 * Silently no-ops on an invalid/self/foreign-tenant referrer rather than
 * failing /start for the invitee.
 */
export async function capturePendingReferral(
  telegramId: bigint,
  tenantId: string,
  startParam: string,
): Promise<void> {
  try {
    const referrerId = parseReferrerId(startParam);
    if (!referrerId) return;

    const referrer = await prisma.user.findFirst({
      where: { id: referrerId, tenantId },
      select: { id: true, telegramId: true },
    });
    if (!referrer || referrer.telegramId === telegramId) return;

    await prisma.pendingReferral.upsert({
      where: { telegramId_tenantId: { telegramId, tenantId } },
      update: { referrerId: referrer.id },
      create: { telegramId, tenantId, referrerId: referrer.id },
    });
  } catch (error) {
    console.error("[referrals] capturePendingReferral failed", error);
  }
}

/**
 * Looks up and deletes any pending referral for this (telegramId, tenantId),
 * returning the referrer's userId if one was found. Best-effort like the
 * rest of this module - called unconditionally on every login, so a failure
 * here (a schema not yet migrated, a transient DB error) must never take
 * sign-in down with it.
 */
export async function consumePendingReferral(
  telegramId: bigint,
  tenantId: string,
): Promise<string | null> {
  try {
    const pending = await prisma.pendingReferral.findUnique({
      where: { telegramId_tenantId: { telegramId, tenantId } },
      select: { id: true, referrerId: true },
    });
    if (!pending) return null;

    await prisma.pendingReferral.delete({ where: { id: pending.id } });
    return pending.referrerId;
  } catch (error) {
    console.error("[referrals] consumePendingReferral failed", error);
    return null;
  }
}

/**
 * Pays out the one-time referral bonus the first time a referred user's
 * order is marked COMPLETED. The updateMany guard (referralRewardPaid:
 * false in the where clause) makes this safe to call on every completion -
 * only the call that actually flips the flag from false to true goes on to
 * credit the referrer, so a second completion (or a concurrent one) never
 * pays out twice.
 */
export async function maybeRewardReferral(userId: string, tenantId: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { referredById: true, referralRewardPaid: true },
    });
    if (!user?.referredById || user.referralRewardPaid) return;

    const claimed = await prisma.user.updateMany({
      where: { id: userId, referralRewardPaid: false },
      data: { referralRewardPaid: true },
    });
    if (claimed.count === 0) return;

    const referrer = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.referredById! },
        data: { balanceCents: { increment: REFERRAL_BONUS_CENTS } },
      });
      await tx.walletTransaction.create({
        data: {
          userId: updated.id,
          type: WalletTransactionType.CREDIT,
          amountCents: REFERRAL_BONUS_CENTS,
          reason: "Referral bonus",
        },
      });
      return updated;
    });

    await notifyBalanceUpdated(referrer.telegramId, tenantId, referrer.balanceCents);
  } catch (error) {
    console.error("[referrals] maybeRewardReferral failed", error);
  }
}
