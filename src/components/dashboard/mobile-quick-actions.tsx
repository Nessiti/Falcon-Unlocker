"use client";

import Link from "next/link";

const ACTIONS: { label: string; href: string; icon: string }[] = [
  { label: "My Orders", href: "/orders", icon: "🧾" },
  { label: "Wallet", href: "/wallet", icon: "💰" },
  { label: "Tickets", href: "/support?tab=tickets", icon: "💬" },
  { label: "FAQ", href: "/support?tab=faq", icon: "📋" },
  { label: "Settings", href: "/settings", icon: "⚙️" },
  { label: "Help Center", href: "/support?tab=help", icon: "❓" },
  { label: "About", href: "/about", icon: "ℹ️" },
];

export function MobileQuickActions({ onNewsClick }: { onNewsClick: () => void }) {
  return (
    <div className="grid grid-cols-4 gap-3 rounded-2xl border border-border bg-surface p-4">
      {ACTIONS.map((action) => (
        <Link key={action.href} href={action.href} className="flex flex-col items-center gap-1.5">
          <span className="text-xl text-accent" aria-hidden>
            {action.icon}
          </span>
          <span className="text-center text-[11px] text-foreground">{action.label}</span>
        </Link>
      ))}
      <button type="button" onClick={onNewsClick} className="flex flex-col items-center gap-1.5">
        <span className="text-xl text-accent" aria-hidden>
          📰
        </span>
        <span className="text-center text-[11px] text-foreground">News</span>
      </button>
    </div>
  );
}
