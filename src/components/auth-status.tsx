"use client";

import { useTelegramUser } from "@/components/telegram-user-provider";

export function AuthStatus() {
  const auth = useTelegramUser();

  switch (auth.status) {
    case "booting":
      return <p className="text-sm text-hint">Connecting to Telegram…</p>;
    case "unavailable":
      return <p className="text-sm text-hint">Open this app from Telegram to sign in.</p>;
    case "loading":
      return <p className="text-sm text-hint">Signing in…</p>;
    case "error":
      return <p className="text-sm text-accent">Sign-in failed: {auth.message}</p>;
    case "authenticated": {
      const { user } = auth;
      return (
        <p className="text-sm text-hint">
          Signed in as {user.firstName}
          {user.lastName ? ` ${user.lastName}` : ""} · {user.role}
          {user.isFirstUser ? " · first user" : ""}
        </p>
      );
    }
  }
}
