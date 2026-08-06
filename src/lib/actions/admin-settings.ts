"use server";

import { requireStaff } from "@/lib/telegram/admin";
import { TelegramAuthError } from "@/lib/telegram/auth";

export type AppSettingsStatus = {
  botConfigured: boolean;
  botUsername: string | null;
  adminIdConfigured: boolean;
  appUrlConfigured: boolean;
  webhookSecretConfigured: boolean;
};

export type GetAppSettingsResult =
  | { ok: true; status: AppSettingsStatus }
  | { ok: false; error: string };

/** Settings (Chapter 11): read-only view of the app's environment configuration. */
export async function getAppSettingsStatusAction(initData: string): Promise<GetAppSettingsResult> {
  try {
    await requireStaff(initData);

    return {
      ok: true,
      status: {
        botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
        botUsername: process.env.TELEGRAM_BOT_USERNAME || null,
        adminIdConfigured: Boolean(process.env.TELEGRAM_ADMIN_ID),
        appUrlConfigured: Boolean(process.env.NEXT_PUBLIC_APP_URL),
        webhookSecretConfigured: Boolean(process.env.TELEGRAM_WEBHOOK_SECRET),
      },
    };
  } catch (error) {
    const message = error instanceof TelegramAuthError ? error.message : "Failed to load settings";
    return { ok: false, error: message };
  }
}
