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
  mountMiniApp,
  mountThemeParams,
  mountViewport,
  bindMiniAppCssVars,
  bindThemeParamsCssVars,
  bindViewportCssVars,
  expandViewport,
  miniAppReady,
} from "@telegram-apps/sdk-react";

export type TelegramStatus = "booting" | "ready" | "not-telegram" | "error";
type MountStatus = "booting" | "ready" | "error";

const TelegramStatusContext = createContext<TelegramStatus>("booting");

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

  useEffect(() => {
    if (!inTelegram) return;

    let cancelled = false;

    (async () => {
      try {
        init();
        await Promise.all([mountMiniApp(), mountThemeParams(), mountViewport()]);

        bindMiniAppCssVars();
        bindThemeParamsCssVars();
        bindViewportCssVars();

        expandViewport();
        miniAppReady();

        if (!cancelled) setMountStatus("ready");
      } catch (error) {
        console.error("[telegram] failed to initialize Mini App SDK", error);
        if (!cancelled) setMountStatus("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [inTelegram]);

  const status: TelegramStatus = inTelegram ? mountStatus : "not-telegram";

  return (
    <TelegramStatusContext.Provider value={status}>
      <div data-telegram-status={status} className="flex min-h-full flex-col">
        {children}
      </div>
    </TelegramStatusContext.Provider>
  );
}
