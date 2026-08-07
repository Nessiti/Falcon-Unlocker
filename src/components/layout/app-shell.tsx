"use client";

import { useState, type ReactNode } from "react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { Navbar } from "@/components/layout/navbar";
import { AppMenu } from "@/components/layout/app-menu";
import { Sidebar } from "@/components/layout/sidebar";
import { DesktopHeader } from "@/components/layout/desktop-header";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { BrandThemeSync } from "@/components/layout/brand-theme-sync";
import { AdminAlertsProvider } from "@/components/admin/admin-alerts-provider";

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
        <p className="text-sm text-accent">Couldn&apos;t sign you in. Please try again.</p>
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
      <BrandThemeSync />
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

          {/* Page content mounts once - only the surrounding chrome above switches by breakpoint. */}
          <div className="flex flex-1 flex-col pb-[calc(4rem+var(--safe-area-inset-bottom))] lg:pb-0">
            {children}
          </div>

          <BottomTabBar />
        </div>
      </div>
    </AdminAlertsProvider>
  );
}
