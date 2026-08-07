import "server-only";

const TELEGRAM_API_BASE = "https://api.telegram.org";

export type RegisterWebhookResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Sets this bot's default chat menu button (the button next to the message
 * input, visible to every user in their own chat with the bot - not a
 * per-user setting) to open the Mini App directly, via Telegram's official
 * setChatMenuButton + MenuButtonWebApp. Best-effort: a tenant's webhook
 * registration must not fail just because this secondary call did, so
 * failures are logged and swallowed rather than propagated.
 */
async function setBotMenuButton(token: string, appUrl: string): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_BASE}/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: { type: "web_app", text: "Open App", web_app: { url: appUrl } },
      }),
    });
    const data = (await response.json()) as { ok: boolean; description?: string };
    if (!data.ok) {
      console.error("[telegram] setChatMenuButton rejected", data.description);
    }
  } catch (error) {
    console.error("[telegram] failed to set chat menu button", error);
  }
}

/**
 * Registers (or re-registers) a tenant's bot webhook with Telegram's
 * setWebhook API, pointing at that tenant's own route
 * (/api/telegram/webhook/[tenantId]), and sets that bot's default menu
 * button to open the Mini App (setChatMenuButton/MenuButtonWebApp) so every
 * customer sees a native "Open App" button in the chat with no separate
 * setup step. Before this, every new brand's bot needed a manual
 * `curl .../setWebhook` step (and a manual menu-button setup) after being
 * added in Super Admin - this closes that gap by doing both automatically
 * whenever a bot token is set, and exposes the same call as a retry button
 * for tenants that predate this or whose registration failed the first time.
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
    await setBotMenuButton(token, appUrl);
    return { ok: true, url };
  } catch {
    return { ok: false, error: "Could not reach Telegram's API to register the webhook" };
  }
}
