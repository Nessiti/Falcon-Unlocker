"use client";

import { useState, type ReactNode } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Navbar } from "@/components/layout/navbar";
import { AppMenu } from "@/components/layout/app-menu";
import { Sidebar } from "@/components/layout/sidebar";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { AdminAlertsProvider } from "@/components/admin/admin-alerts-provider";

function CenteredMessage({ children }: { children: ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <span className="text-4xl">🦅</span>
      {children}
    </main>
  );
}

function DebugInfo() {
  const [info] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const hasTelegramWebApp = typeof (window as unknown as { Telegram?: { WebApp?: unknown } }).Telegram?.WebApp !== "undefined";
    return [
      `href: ${window.location.href}`,
      `hasHash: ${window.location.hash.length > 0}`,
      `hash: ${window.location.hash || "(empty)"}`,
      `search: ${window.location.search || "(empty)"}`,
      `window.Telegram.WebApp: ${hasTelegramWebApp}`,
      `userAgent: ${navigator.userAgent}`,
    ].join("\n");
  });

  return (
    <pre className="mt-4 max-w-full overflow-x-auto whitespace-pre-wrap break-all rounded-lg bg-surface p-3 text-left text-[10px] text-hint">
      {info}
    </pre>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const auth = useTelegramUser();
  const [menuOpen, setMenuOpen] = useState(false);

  if (auth.status === "unavailable") {
    return (
      <CenteredMessage>
        <p className="text-sm text-hint">Open this app from Telegram to continue.</p>
        <DebugInfo />
      </CenteredMessage>
    );
  }

  if (auth.status === "error") {
    return (
      <CenteredMessage>
        <p className="text-sm text-accent">Sign-in failed: {auth.message}</p>
        <DebugInfo />
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
    <AdminAlertsProvider>
      <div className="flex min-h-full flex-1 lg:flex-row">
        {/* Desktop dashboard shell: persistent sidebar (lg breakpoint and up). */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        <div className="flex min-h-full flex-1 flex-col">
          {/* Mobile shell: top bar + drawer menu (below lg). */}
          <div className="lg:hidden">
            <Navbar user={auth.user} onMenuClick={() => setMenuOpen(true)} />
            <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
          </div>

          <div className="hidden lg:block">
            <DesktopHeader user={auth.user} />
          </div>

          {/* Page content mounts once — only the surrounding chrome above switches by breakpoint. */}
          <div className="flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </AdminAlertsProvider>
  );
}
