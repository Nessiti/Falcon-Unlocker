"use server";

import { prisma } from "@/lib/prisma";
import { TelegramAuthError, verifyTelegramInitData } from "@/lib/telegram/auth";

export type PingResult =
  | { ok: true; telegramUserId: number; serverTime: string }
  | { ok: false; error: string };

/**
 * Foundation smoke test: proves Telegram Auth, Server Actions and the Neon/Prisma
 * connection are wired together correctly.
 */
export async function pingAction(initData: string): Promise<PingResult> {
  try {
    const parsed = await verifyTelegramInitData(initData);
    if (!parsed.user) {
      return { ok: false, error: "No Telegram user in init data" };
    }

    const [{ now }] = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() as now`;

    return { ok: true, telegramUserId: parsed.user.id, serverTime: now.toISOString() };
  } catch (error) {
    const message =
      error instanceof TelegramAuthError ? error.message : "Database connection failed";
    return { ok: false, error: message };
  }
}
