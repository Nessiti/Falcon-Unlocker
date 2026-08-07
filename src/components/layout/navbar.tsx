"use client";

import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/actions/auth";
import { formatUsd } from "@/lib/ui";
import { useAdminAlerts } from "@/components/admin/admin-alerts-provider";
import { FullscreenButton } from "@/components/layout/fullscreen-button";

function alertsTarget(alerts: ReturnType<typeof useAdminAlerts>): string | null {
  if (!alerts || alerts.total === 0) return null;
  if (alerts.newOrders > 0) return "/admin/orders";
  if (alerts.newTickets > 0) return "/support";
  if (alerts.newRecharges > 0) return "/wallet";
  return null;
}

export function Navbar({
  user,
  onMenuClick,
}: {
  user: AuthUser;
  onMenuClick: () => void;
}) {
  const router = useRouter();
  const alerts = useAdminAlerts();
  const target = alertsTarget(alerts);
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

      <span className="flex flex-1 items-center gap-2 truncate text-sm font-semibold text-foreground">
        {user.tenantLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo
          <img
            src={user.tenantLogoUrl}
            alt={user.tenantName}
            className="h-6 w-6 shrink-0 rounded object-contain"
          />
        ) : null}
        <span className="truncate">{user.tenantName}</span>
      </span>

      <span className="shrink-0 rounded-full bg-surface px-3 py-1 text-xs font-medium text-foreground">
        {formatUsd(user.balanceCents)}
      </span>

      {/* Desktop and tablets only - phones are already fullscreen-equivalent in Telegram. */}
      <FullscreenButton className="hidden sm:flex" />

      <button
        type="button"
        aria-label="Notifications"
        onClick={() => target && router.push(target)}
        disabled={!target}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-foreground hover:bg-surface disabled:cursor-default"
      >
        🔔
        {alerts && alerts.total > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground ring-2 ring-background">
            {alerts.total}
          </span>
        ) : null}
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
