"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  setMiniAppHeaderColor,
  setMiniAppBottomBarColor,
  mountSwipeBehavior,
  isSwipeBehaviorMounted,
  disableVerticalSwipes,
  mountBackButton,
  isBackButtonMounted,
  showBackButton,
  hideBackButton,
  onBackButtonClick,
} from "@telegram-apps/sdk-react";

/**
 * Wires the app into Telegram's own native chrome, so it stops looking like
 * a website in a WebView:
 *
 * - Header and bottom-bar colors follow `bg_color`, so Telegram's title bar
 *   blends into the app instead of sitting above it as a differently
 *   colored band (the single most obvious "this is a web page" tell).
 * - Vertical swipes are disabled, so scrolling a long page can't
 *   accidentally close the Mini App - the usual reason a Mini App feels
 *   fragile compared to a native screen.
 * - Telegram's own back button appears on every page except Home and pops
 *   the history stack, instead of leaving users to hunt for an in-app back
 *   affordance that isn't there.
 *
 * Every call is guarded by `isAvailable()`, so older Telegram clients that
 * don't support a given method simply keep their current behavior.
 */
export function TelegramNativeChrome() {
  const pathname = usePathname();
  const router = useRouter();

  // One-time native chrome setup: colors + swipe behavior.
  useEffect(() => {
    if (setMiniAppHeaderColor.isAvailable()) {
      setMiniAppHeaderColor("bg_color");
    }
    if (setMiniAppBottomBarColor.isAvailable()) {
      setMiniAppBottomBarColor("bg_color");
    }

    try {
      if (mountSwipeBehavior.isAvailable() && !isSwipeBehaviorMounted()) {
        mountSwipeBehavior();
      }
      if (disableVerticalSwipes.isAvailable()) {
        disableVerticalSwipes();
      }
    } catch (error) {
      console.error("[telegram] swipe behavior setup failed", error);
    }
  }, []);

  // Native back button, kept in sync with the current route.
  useEffect(() => {
    try {
      if (mountBackButton.isAvailable() && !isBackButtonMounted()) {
        mountBackButton();
      }
    } catch (error) {
      console.error("[telegram] back button mount failed", error);
      return;
    }

    const onHome = pathname === "/";
    if (showBackButton.isAvailable()) {
      if (onHome) hideBackButton();
      else showBackButton();
    }

    if (!onBackButtonClick.isAvailable()) return;
    const off = onBackButtonClick(() => router.back());
    return () => off();
  }, [pathname, router]);

  return null;
}
