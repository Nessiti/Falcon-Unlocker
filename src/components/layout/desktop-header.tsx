"use client";

import type { AuthUser } from "@/lib/actions/auth";
import { formatUsd } from "@/lib/ui";

/** Top bar for the desktop dashboard layout — the sidebar covers navigation, so no menu button. */
export function DesktopHeader({ user }: { user: AuthUser }) {
  const initial = user.firstName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
      <span className="flex-1 text-sm font-medium text-hint">
        Welcome back, {user.firstName}
      </span>

      <span className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm font-medium text-foreground">
        {formatUsd(user.balanceCents)}
      </span>

      <button
        type="button"
        aria-label="Notifications"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-foreground hover:bg-surface"
      >
        🔔
      </button>

      {user.avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- external Telegram-hosted avatar
        <img
          src={user.avatarUrl}
          alt={user.firstName}
          className="h-9 w-9 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
          {initial}
        </span>
      )}
    </header>
  );
}
