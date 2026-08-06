"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  init,
  isTMA,
  mountMiniAppSync,
  isMiniAppMounted,
  mountThemeParamsSync,
  isThemeParamsMounted,
  mountViewport,
  isViewportMounted,
  isViewportMounting,
  bindMiniAppCssVars,
  bindThemeParamsCssVars,
  bindViewportCssVars,
  expandViewport,
  miniAppReady,
} from "@telegram-apps/sdk-react";

export type TelegramStatus = "booting" | "ready" | "not-telegram" | "error";
type MountStatus = "booting" | "ready" | "error";
export type TelegramState = { status: TelegramStatus; error?: string };

const TelegramStatusContext = createContext<TelegramState>({ status: "booting" });

/** Whether the Telegram Mini App SDK finished mounting successfully in this session. */
export function useTelegramStatus() {
  return useContext(TelegramStatusContext);
}

/**
 * The sync isTMA() check only looks at whether launch params are already
 * sitting in the URL — on some real Telegram clients (notably slower to
 * inject the bridge, e.g. some Desktop/Android builds) that's not yet true
 * on first paint, even though the app genuinely is running inside Telegram.
 * Concluding "not Telegram" from that alone stranded real users on the
 * "Open this app from Telegram" screen. The async "complete" check actually
 * pings the Mini App bridge and waits for a real reply, so it's the
 * fallback here instead of a final verdict.
 */
async function detectTelegram(): Promise<boolean> {
  if (isTMA()) return true;
  try {
    return await isTMA("complete", { timeout: 3000 });
  } catch {
    return false;
  }
}

export function TelegramRoot({ children }: { children: ReactNode }) {
  const [inTelegram, setInTelegram] = useState<boolean | null>(null);
  const [mountStatus, setMountStatus] = useState<MountStatus>("booting");
  const [mountError, setMountError] = useState<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    detectTelegram().then((result) => {
      if (!cancelled) setInTelegram(result);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!inTelegram) return;

    let cancelled = false;

    (async () => {
      try {
        init();

        if (mountMiniAppSync.isAvailable() && !isMiniAppMounted()) {
          mountMiniAppSync();
        }
        if (mountThemeParamsSync.isAvailable() && !isThemeParamsMounted()) {
          mountThemeParamsSync();
        }
        if (mountViewport.isAvailable() && !isViewportMounted() && !isViewportMounting()) {
          try {
            // Some Telegram clients never reply to this request. Without a
            // timeout this await hangs forever, stranding the whole app on
            // "Loading…" — viewport info (safe-area insets, expand) is a
            // nice-to-have, not required for the app to work, so a
            // timeout/failure here shouldn't block reaching "ready".
            await mountViewport({ timeout: 4000 });
          } catch (error) {
            console.error("[telegram] viewport mount failed or timed out", error);
          }
        }

        bindMiniAppCssVars();
        bindThemeParamsCssVars();
        if (isViewportMounted()) {
          bindViewportCssVars();
          expandViewport();
        }
        miniAppReady();

        if (!cancelled) setMountStatus("ready");
      } catch (error) {
        console.error("[telegram] failed to initialize Mini App SDK", error);
        if (!cancelled) {
          setMountError(error instanceof Error ? error.message : String(error));
          setMountStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inTelegram]);

  const status: TelegramStatus =
    inTelegram === null ? "booting" : inTelegram ? mountStatus : "not-telegram";
  const state: TelegramState = { status, error: mountError };

  return (
    <TelegramStatusContext.Provider value={state}>
      <div data-telegram-status={status} className="flex min-h-full flex-col">
        {children}
      </div>
    </TelegramStatusContext.Provider>
  );
}
