"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { closeMiniApp } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { useAdminAlerts } from "@/components/admin/admin-alerts-provider";
import { Role } from "@/generated/prisma/browser";

const MAIN_ITEMS = [
  { label: "Dashboard", href: "/", icon: "🏠" },
  { label: "IMEI Services", href: "/imei", icon: "📱" },
  { label: "Server Services", href: "/server", icon: "🖥️" },
  { label: "Orders", href: "/orders", icon: "🧾" },
  { label: "Wallet", href: "/wallet", icon: "💰" },
  { label: "Support", href: "/support", icon: "💬" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "About", href: "/about", icon: "ℹ️" },
];

const ADMIN_ITEMS = [
  { label: "Admin Dashboard", href: "/admin", icon: "📊" },
  { label: "Users", href: "/admin/users", icon: "👥" },
  { label: "Categories", href: "/admin/categories", icon: "🗂️" },
  { label: "Providers", href: "/admin/providers", icon: "🔌" },
  { label: "Admin Orders", href: "/admin/orders", icon: "📦" },
  { label: "Queue", href: "/admin/queue", icon: "🔁" },
  { label: "News", href: "/admin/news", icon: "📰" },
  { label: "Notifications", href: "/admin/notifications", icon: "🔔" },
  { label: "API Logs", href: "/admin/api-logs", icon: "🛰️" },
  { label: "Logs", href: "/admin/logs", icon: "📜" },
  { label: "Statistics", href: "/admin/statistics", icon: "📈" },
  { label: "Admin Settings", href: "/admin/settings", icon: "🛠️" },
];

function NavLink({
  href,
  label,
  icon,
  badge,
}: {
  href: string;
  label: string;
  icon: string;
  badge?: number;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground hover:bg-background"
      }`}
    >
      <span aria-hidden>{icon}</span>
      <span className="flex-1">{label}</span>
      {badge ? (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground ring-2 ring-background">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Persistent desktop navigation, shown at the lg breakpoint instead of the mobile drawer. */
export function Sidebar() {
  const auth = useTelegramUser();
  const alerts = useAdminAlerts();
  const isStaff =
    auth.status === "authenticated" &&
    (auth.user.role === Role.ADMIN || auth.user.role === Role.MODERATOR);

  const badgeByHref: Record<string, number> = alerts
    ? { "/admin/orders": alerts.newOrders, "/support": alerts.newTickets, "/wallet": alerts.newRecharges }
    : {};

  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col gap-1 overflow-y-auto border-r border-border bg-surface p-4">
      <div className="mb-4 flex items-center gap-2 px-1">
        <span className="text-2xl" aria-hidden>
          🦅
        </span>
        <span className="text-sm font-semibold text-foreground">Falcon Unlocker</span>
      </div>

      <nav className="flex flex-col gap-1">
        {MAIN_ITEMS.map((item) => (
          <NavLink key={item.href} {...item} badge={badgeByHref[item.href]} />
        ))}
      </nav>

      {isStaff ? (
        <>
          <p className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-hint">
            Admin
          </p>
          <nav className="flex flex-col gap-1">
            {ADMIN_ITEMS.map((item) => (
              <NavLink key={item.href} {...item} badge={badgeByHref[item.href]} />
            ))}
          </nav>
        </>
      ) : null}

      <button
        type="button"
        onClick={() => {
          if (closeMiniApp.isAvailable()) closeMiniApp();
        }}
        className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm text-accent hover:bg-background"
      >
        <span aria-hidden>🚪</span>
        Logout
      </button>
    </aside>
  );
}
