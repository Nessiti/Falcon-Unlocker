"use client";

import { useEffect } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { readableTextColor } from "@/lib/ui";

/**
 * Overrides the app's button color (`--color-accent`) with the logged-in
 * account's own tenant's brand color, once configured (Chapter 41). Set as
 * an inline style directly on <html> rather than the `--tg-theme-*`
 * variable it's normally sourced from — Telegram's SDK can re-push that
 * variable on its own theme-change events, which would silently clobber a
 * tenant override applied the other way. Falls back to Telegram's own
 * theme (the pre-Chapter-41 default) whenever the tenant hasn't set one.
 */
export function BrandThemeSync() {
  const auth = useTelegramUser();
  const primaryColor = auth.status === "authenticated" ? auth.user.tenantPrimaryColor : null;

  useEffect(() => {
    const root = document.documentElement;
    if (!primaryColor) {
      root.style.removeProperty("--color-accent");
      root.style.removeProperty("--color-accent-foreground");
      return;
    }
    root.style.setProperty("--color-accent", primaryColor);
    root.style.setProperty("--color-accent-foreground", readableTextColor(primaryColor));
  }, [primaryColor]);

  return null;
}
