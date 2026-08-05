import "server-only";
import { parse, validate } from "@tma.js/init-data-node/web";

export class TelegramAuthError extends Error {}

/**
 * Verifies the Telegram Mini App `initData` string was signed by Telegram for
 * our bot, and hasn't expired. Throws {@link TelegramAuthError} otherwise.
 */
export async function verifyTelegramInitData(initData: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new TelegramAuthError("TELEGRAM_BOT_TOKEN is not configured");
  }
  if (!initData) {
    throw new TelegramAuthError("Missing initData");
  }

  try {
    await validate(initData, token);
  } catch {
    throw new TelegramAuthError("Invalid or expired Telegram init data");
  }

  return parse(initData);
}
