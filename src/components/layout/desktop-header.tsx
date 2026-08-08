"use client";

import { useRouter } from "next/navigation";
import type { AuthUser } from "@/lib/actions/auth";
import { formatUsdCompact } from "@/lib/ui";
import { useAdminAlerts } from "@/components/admin/admin-alerts-provider";
import { FullscreenButton } from "@/components/layout/fullscreen-button";
import { Icon } from "@/components/ui/icon";

function alertsTarget(alerts: ReturnType<typeof useAdminAlerts>): string | null {
  if (!alerts || alerts.total === 0) return null;
  if (alerts.newOrders > 0) return "/admin/orders";
  if (alerts.newTickets > 0) return "/support";
  if (alerts.newRecharges > 0) return "/wallet";
  return null;
}

/** Top bar for the desktop dashboard layout - the sidebar covers navigation, so no menu button. */
export function DesktopHeader({ user }: { user: AuthUser }) {
  const router = useRouter();
  const alerts = useAdminAlerts();
  const target = alertsTarget(alerts);

  return (
    <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/95 px-6 py-4 backdrop-blur">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-hint">
        Welcome back, {user.firstName}
      </span>

      <span className="shrink-0 rounded-full bg-accent/10 px-3 py-1.5 text-sm font-semibold text-accent">
        {formatUsdCompact(user.balanceCents)}
      </span>

      <FullscreenButton />

      <button
        type="button"
        aria-label="Notifications"
        onClick={() => target && router.push(target)}
        disabled={!target}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-foreground hover:bg-surface disabled:cursor-default"
      >
        <Icon name="bell" />
        {alerts && alerts.total > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground ring-2 ring-background">
            {alerts.total}
          </span>
        ) : null}
      </button>

      {user.tenantLogoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo
        <img
          src={user.tenantLogoUrl}
          alt={user.tenantName}
          className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-accent/20"
        />
      ) : (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent/10 text-accent ring-2 ring-accent/20">
          <Icon name="shield" className="h-5 w-5" />
        </span>
      )}
    </header>
  );
}
