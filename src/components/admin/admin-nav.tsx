"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "IMEI Services", href: "/imei" },
  { label: "Server Services", href: "/server" },
  { label: "Categories", href: "/admin/categories" },
  { label: "Wallet", href: "/wallet" },
  { label: "Orders", href: "/admin/orders" },
  { label: "News", href: "/admin/news" },
  { label: "Notifications", href: "/admin/notifications" },
  { label: "Logs", href: "/admin/logs" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Support", href: "/support" },
  { label: "About", href: "/about" },
  { label: "Statistics", href: "/admin/statistics" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-2 overflow-x-auto pb-2">
      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
            pathname === item.href
              ? "bg-accent text-accent-foreground"
              : "border border-border text-foreground"
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
