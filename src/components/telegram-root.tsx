"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
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

function subscribe() {
  return () => {};
}

function getSnapshot() {
  return isTMA();
}

function getServerSnapshot() {
  return false;
}

export function TelegramRoot({ children }: { children: ReactNode }) {
  const inTelegram = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [mountStatus, setMountStatus] = useState<MountStatus>("booting");
  const [mountError, setMountError] = useState<string | undefined>(undefined);

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
          await mountViewport();
        }

        bindMiniAppCssVars();
        bindThemeParamsCssVars();
        bindViewportCssVars();

        expandViewport();
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

  const status: TelegramStatus = inTelegram ? mountStatus : "not-telegram";
  const state: TelegramState = { status, error: mountError };

  return (
    <TelegramStatusContext.Provider value={state}>
      <div data-telegram-status={status} className="flex min-h-full flex-col">
        {children}
      </div>
    </TelegramStatusContext.Provider>
  );
}
