"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { selectionHaptic } from "@/lib/haptics";
import { Icon, type IconName } from "@/components/ui/icon";

const TABS: { label: string; href: string; icon: IconName }[] = [
  { label: "Home", href: "/", icon: "home" },
  { label: "Orders", href: "/orders", icon: "receipt" },
  { label: "Wallet", href: "/wallet", icon: "wallet" },
  { label: "Profile", href: "/settings", icon: "user" },
];

/** Fixed bottom navigation, phones only (matches the app's own icon set from the Sidebar). */
export function BottomTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-background/95 shadow-[0_-2px_8px_rgba(0,0,0,0.15)] backdrop-blur lg:hidden"
      style={{ paddingBottom: "var(--safe-area-inset-bottom)" }}
    >
      {TABS.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            onClick={() => {
              if (!active) selectionHaptic();
            }}
            className="flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-transform active:scale-95"
          >
            <span
              className={`flex h-8 w-12 items-center justify-center rounded-full transition-colors ${
                active ? "bg-accent/15 text-accent" : "text-hint"
              }`}
            >
              <Icon name={tab.icon} />
            </span>
            <span className={active ? "text-accent" : "text-hint"}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
