"use client";

import { useState, type ReactNode } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Navbar } from "@/components/layout/navbar";
import { AppMenu } from "@/components/layout/app-menu";

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="text-4xl">🦅</span>
      {children}
    </main>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useTelegramUser();
  const [menuOpen, setMenuOpen] = useState(false);

  if (auth.status === "unavailable") {
    return (
      <CenteredMessage>
        <p className="text-sm text-hint">Open this app from Telegram to continue.</p>
      </CenteredMessage>
    );
  }

  if (auth.status === "error") {
    return (
      <CenteredMessage>
        <p className="text-sm text-accent">Sign-in failed: {auth.message}</p>
      </CenteredMessage>
    );
  }

  if (auth.status === "booting" || auth.status === "loading") {
    return (
      <CenteredMessage>
        <p className="text-sm text-hint">Loading…</p>
      </CenteredMessage>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <Navbar user={auth.user} onMenuClick={() => setMenuOpen(true)} />
      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
