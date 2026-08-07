import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type RegisterWebhookResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Registers (or re-registers) a tenant's bot webhook with Telegram's
 * setWebhook API, pointing at that tenant's own route
 * (/api/telegram/webhook/[tenantId]). Before this, every new brand's bot
 * needed a manual `curl .../setWebhook` step after being added in Super
 * Admin — this closes that gap by doing it automatically whenever a bot
 * token is set, and exposes the same call as a retry button for tenants
 * that predate this or whose registration failed the first time.
 */
export async function registerTenantWebhook(
  tenantId: string,
  token: string,
): Promise<RegisterWebhookResult> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (!appUrl) return { ok: false, error: "Server misconfiguration: NEXT_PUBLIC_APP_URL is not set" };
  if (!secret) return { ok: false, error: "Server misconfiguration: TELEGRAM_WEBHOOK_SECRET is not set" };

  const url = `${appUrl.replace(/\/$/, "")}/api/telegram/webhook/${tenantId}`;

  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret_token: secret }),
    });
    const data = (await response.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      return { ok: false, error: data.description ?? "Telegram rejected the webhook registration" };
    }
    return { ok: true, url };
  } catch {
    return { ok: false, error: "Could not reach Telegram's API to register the webhook" };
  }
}
