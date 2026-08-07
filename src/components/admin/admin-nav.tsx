"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAlerts } from "@/components/admin/admin-alerts-provider";

const MAIN_ITEMS = [
  { label: "Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "IMEI Services", href: "/admin/imei", icon: "📱" },
  { label: "Server Services", href: "/admin/server", icon: "🖥️" },
  { label: "Categories", href: "/admin/categories", icon: "🗂️" },
  { label: "Providers", href: "/admin/providers", icon: "🔌" },
  { label: "Monitoring", href: "/admin/monitoring", icon: "📡" },
  { label: "Orders", href: "/admin/orders", icon: "📦" },
  { label: "Wallet", href: "/wallet", icon: "💰" },
  { label: "Queue", href: "/admin/queue", icon: "🔁" },
  { label: "Support", href: "/support", icon: "💬" },
];

const SYSTEM_ITEMS = [
  { label: "Cron", href: "/admin/cron", icon: "⏱️" },
  { label: "Security", href: "/admin/security", icon: "🛡️" },
  { label: "News", href: "/admin/news", icon: "📰" },
  { label: "Notifications", href: "/admin/notifications", icon: "🔔" },
  { label: "API Logs", href: "/admin/api-logs", icon: "🛰️" },
  { label: "API Keys", href: "/admin/api-keys", icon: "🔑" },
  { label: "Logs", href: "/admin/logs", icon: "📜" },
  { label: "Statistics", href: "/admin/statistics", icon: "📈" },
  { label: "Settings", href: "/admin/settings", icon: "🛠️" },
  { label: "About", href: "/about", icon: "ℹ️" },
];

function NavGroup({
  items,
  pathname,
  badgeByHref,
}: {
  items: typeof MAIN_ITEMS;
  pathname: string;
  badgeByHref: Record<string, number>;
}) {
  return (
    <div className="flex w-full min-w-0 flex-wrap gap-2">
      {items.map((item) => {
        const badge = badgeByHref[item.href];
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors active:scale-95 ${
              active
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground hover:bg-surface"
            }`}
          >
            <span aria-hidden>{item.icon}</span>
            {item.label}
            {badge ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground ring-2 ring-background">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Mobile admin navigation (the desktop Sidebar takes over at `lg:`). Wraps
 * onto multiple rows instead of a single horizontally-scrolling strip - a
 * 19-item single-line scroller hides most sections behind blind swiping,
 * exactly the "horizontal scroll where it shouldn't be" pattern the rest of
 * the app has been fixed to avoid. Grouped the same way the desktop
 * Sidebar is (day-to-day management vs. platform/system tools) so it stays
 * scannable at a glance instead of one long undifferentiated list.
 */
export function AdminNav() {
  const pathname = usePathname();
  const alerts = useAdminAlerts();

  const badgeByHref: Record<string, number> = alerts
    ? { "/admin/orders": alerts.newOrders, "/support": alerts.newTickets, "/wallet": alerts.newRecharges }
    : {};

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <NavGroup items={MAIN_ITEMS} pathname={pathname} badgeByHref={badgeByHref} />
      <div className="border-t border-border pt-3">
        <NavGroup items={SYSTEM_ITEMS} pathname={pathname} badgeByHref={badgeByHref} />
      </div>
    </div>
  );
}
