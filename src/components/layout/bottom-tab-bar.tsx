"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { label: "Home", href: "/", icon: "🏠" },
  { label: "Orders", href: "/orders", icon: "🧾" },
  { label: "Wallet", href: "/wallet", icon: "💰" },
  { label: "Profile", href: "/settings", icon: "👤" },
];

/** Fixed bottom navigation, phones only (matches the app's own icon set from the Sidebar). */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "var(--safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active ? "text-accent" : "text-hint"
            }`}
          >
            <span className="text-lg" aria-hidden>
              {tab.icon}
            </span>
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
