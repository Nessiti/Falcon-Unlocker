"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAdminAlerts } from "@/components/admin/admin-alerts-provider";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "IMEI Services", href: "/imei" },
  { label: "Server Services", href: "/server" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Providers", href: "/admin/providers" },
  { label: "Wallet", href: "/wallet" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Queue", href: "/admin/queue" },
  { label: "Cron", href: "/admin/cron" },
  { label: "News", href: "/admin/news" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "API Logs", href: "/admin/api-logs" },
  { label: "Logs", href: "/admin/logs" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Support", href: "/support" },
  { label: "About", href: "/about" },
  { label: "Statistics", href: "/admin/statistics" },
];

export function AdminNav() {
  const pathname = usePathname();
  const alerts = useAdminAlerts();

  const badgeByHref: Record<string, number> = alerts
    ? { "/admin/orders": alerts.newOrders, "/support": alerts.newTickets, "/wallet": alerts.newRecharges }
    : {};

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {NAV_ITEMS.map((item) => {
        const badge = badgeByHref[item.href];
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
              pathname === item.href
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {item.label}
            {badge ? (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground ring-2 ring-background">
                {badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
