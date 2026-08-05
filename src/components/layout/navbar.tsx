"use client";

import type { AuthUser } from "@/lib/actions/auth";

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export function Navbar({
  user,
  onMenuClick,
}: {
  user: AuthUser;
  onMenuClick: () => void;
}) {
  const initial = user.firstName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Open menu"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-foreground hover:bg-surface"
      >
        ☰
      </button>

      <span className="flex-1 truncate text-sm font-semibold text-foreground">
        Falcon Unlocker
      </span>

      <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground">
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
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
          {initial}
        </span>
      )}
    </header>
  );
}
