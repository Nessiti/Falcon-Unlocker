"use client";

import { useEffect } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { readableTextColor } from "@/lib/ui";

/**
 * Overrides the app's button color (`--brand-accent`) with the logged-in
 * account's own tenant's brand color, once configured. Set as an inline
 * style directly on <html> rather than the `--tg-theme-*` variable it's
 * normally sourced from - Telegram's SDK can re-push that variable on its
 * own theme-change events, which would silently clobber a tenant override
 * applied the other way. `--brand-accent` is a plain custom property (not a
 * Tailwind `@theme inline` alias), so setting it here is what actually
 * changes the rendered button color. Falls back to Telegram's own theme
 * whenever the tenant hasn't set one.
 */
export function BrandThemeSync() {
  const auth = useTelegramUser();
  const primaryColor = auth.status === "authenticated" ? auth.user.tenantPrimaryColor : null;

  useEffect(() => {
    const root = document.documentElement;
    if (!primaryColor) {
      root.style.removeProperty("--brand-accent");
      root.style.removeProperty("--brand-accent-foreground");
      return;
    }
    root.style.setProperty("--brand-accent", primaryColor);
    root.style.setProperty("--brand-accent-foreground", readableTextColor(primaryColor));
  }, [primaryColor]);

  return null;
}
