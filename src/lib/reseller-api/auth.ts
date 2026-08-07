import "server-only";
import { prisma } from "@/lib/prisma";
import { UserStatus } from "@/generated/prisma/client";
import { verifyApiSecret } from "@/lib/reseller-api/crypto";

export type ResellerContext = {
  userId: string;
  tenantId: string;
  telegramId: bigint;
  firstName: string;
  lastName: string | null;
  balanceCents: number;
};

/** Authenticates an incoming reseller API call: valid key+secret, key enabled, account active. */
export async function authenticateResellerApi(
  key: string | null,
  secret: string | null,
): Promise<{ ok: true; context: ResellerContext } | { ok: false; error: string }> {
  if (!key || !secret) return { ok: false, error: "Missing API credentials" };

  const apiKey = await prisma.apiKey.findUnique({
    where: { key },
    include: { user: true },
  });
  if (!apiKey || !apiKey.enabled) return { ok: false, error: "Invalid API key" };
  if (!verifyApiSecret(secret, apiKey.secretHash)) return { ok: false, error: "Invalid API secret" };
  if (apiKey.user.status !== UserStatus.ACTIVE) return { ok: false, error: "Account is not active" };

  await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } });

  return {
    ok: true,
    context: {
      userId: apiKey.user.id,
      tenantId: apiKey.tenantId,
      telegramId: apiKey.user.telegramId,
      firstName: apiKey.user.firstName,
      lastName: apiKey.user.lastName,
      balanceCents: apiKey.user.balanceCents,
    },
  };
}
