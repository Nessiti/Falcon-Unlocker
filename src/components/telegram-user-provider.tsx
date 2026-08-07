"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramStatus } from "@/components/telegram-root";
import { loginAction, type AuthUser } from "@/lib/actions/auth";

export type AuthState =
  | { status: "booting" }
  | { status: "loading" }
  | { status: "authenticated"; user: AuthUser }
  | { status: "unavailable" }
  | { status: "error"; message: string };

const TelegramUserContext = createContext<AuthState>({ status: "booting" });
const TelegramUserRefreshContext = createContext<() => Promise<void>>(async () => {});

/** The Telegram-authenticated user for this session, and where the login flow is at. */
export function useTelegramUser() {
  return useContext(TelegramUserContext);
}

/**
 * Re-runs loginAction and pushes the fresh AuthUser into context - call this
 * right after saving anything that changes what AuthUser exposes (brand
 * name/logo/color, PIN status, biometric status, ...) so every component
 * reading from useTelegramUser() picks up the new value immediately, instead
 * of showing stale data until the next full reload. No-ops before
 * authentication (nothing to refresh yet).
 */
export function useRefreshTelegramUser() {
  return useContext(TelegramUserRefreshContext);
}

function TelegramUserProviderReady({ children }: { children: ReactNode }) {
  const initData = useRawInitData();
  const [state, setState] = useState<AuthState>(() =>
    initData ? { status: "loading" } : { status: "error", message: "Missing Telegram init data" },
  );

  const refresh = useCallback(async () => {
    if (!initData) return;
    const result = await loginAction(initData);
    setState(
      result.ok
        ? { status: "authenticated", user: result.user }
        : { status: "error", message: result.error },
    );
  }, [initData]);

  useEffect(() => {
    if (!initData) return;

    let cancelled = false;

    loginAction(initData).then((result) => {
      if (cancelled) return;
      setState(
        result.ok
          ? { status: "authenticated", user: result.user }
          : { status: "error", message: result.error },
      );
    });

    return () => {
      cancelled = true;
    };
  }, [initData]);

  return (
    <TelegramUserContext.Provider value={state}>
      <TelegramUserRefreshContext.Provider value={refresh}>{children}</TelegramUserRefreshContext.Provider>
    </TelegramUserContext.Provider>
  );
}

export function TelegramUserProvider({ children }: { children: ReactNode }) {
  const telegram = useTelegramStatus();

  if (telegram.status === "booting") {
    return (
      <TelegramUserContext.Provider value={{ status: "booting" }}>
        {children}
      </TelegramUserContext.Provider>
    );
  }

  if (telegram.status === "error") {
    return (
      <TelegramUserContext.Provider
        value={{ status: "error", message: telegram.error ?? "Failed to initialize the Telegram SDK" }}
      >
        {children}
      </TelegramUserContext.Provider>
    );
  }

  if (telegram.status !== "ready") {
    return (
      <TelegramUserContext.Provider value={{ status: "unavailable" }}>
        {children}
      </TelegramUserContext.Provider>
    );
  }

  return <TelegramUserProviderReady>{children}</TelegramUserProviderReady>;
}
