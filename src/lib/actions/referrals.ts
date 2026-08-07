"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/telegram/current-user";
import { TelegramAuthError } from "@/lib/telegram/auth";
import { buildReferralStartParam, REFERRAL_BONUS_CENTS } from "@/lib/referrals";

export type ReferralInfo = {
  /** null when the tenant's bot has no username configured yet - nothing to link to. */
  referralLink: string | null;
  referredCount: number;
  rewardedCount: number;
  bonusCents: number;
};

export type GetReferralInfoResult = { ok: true; info: ReferralInfo } | { ok: false; error: string };

/** The customer's own Referrals page: their personal invite link and how it's paid off so far. */
export async function getReferralInfoAction(initData: string): Promise<GetReferralInfoResult> {
  try {
    const user = await getCurrentUser(initData);

    const [tenant, referredCount, rewardedCount] = await Promise.all([
      prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { telegramBotUsername: true } }),
      prisma.user.count({ where: { referredById: user.id } }),
      prisma.user.count({ where: { referredById: user.id, referralRewardPaid: true } }),
    ]);

    const botUsername = tenant?.telegramBotUsername?.replace(/^@/, "");
    const referralLink = botUsername
      ? `https://t.me/${botUsername}?start=${buildReferralStartParam(user.id)}`
      : null;

    return {
      ok: true,
      info: { referralLink, referredCount, rewardedCount, bonusCents: REFERRAL_BONUS_CENTS },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load referral info";
    return { ok: false, error: message };
  }
}
