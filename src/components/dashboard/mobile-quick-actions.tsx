"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { selectionHaptic } from "@/lib/haptics";

const ACTIONS: { label: string; href: string; icon: IconName }[] = [
  { label: "My Orders", href: "/orders", icon: "receipt" },
  { label: "Wallet", href: "/wallet", icon: "wallet" },
  { label: "Tickets", href: "/support?tab=tickets", icon: "message" },
  { label: "FAQ", href: "/support?tab=faq", icon: "list" },
  { label: "Notifications", href: "/notifications", icon: "bell" },
  { label: "Settings", href: "/settings", icon: "settings" },
  { label: "Help Center", href: "/support?tab=help", icon: "help" },
];

function ActionIcon({ icon }: { icon: IconName }) {
  return (
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
      <Icon name={icon} />
    </span>
  );
}

export function MobileQuickActions({ onNewsClick }: { onNewsClick: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      {ACTIONS.map((action) => (
        <Link
          key={action.href}
          href={action.href}
          onClick={selectionHaptic}
          className="flex min-w-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
        >
          <ActionIcon icon={action.icon} />
          <span className="w-full truncate text-center text-[11px] text-foreground">{action.label}</span>
        </Link>
      ))}
      <button
        type="button"
        onClick={() => {
          selectionHaptic();
          onNewsClick();
        }}
        className="flex min-w-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
      >
        <ActionIcon icon="news" />
        <span className="w-full truncate text-center text-[11px] text-foreground">News</span>
      </button>
    </div>
  );
}
