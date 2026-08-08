"use client";

import Link from "next/link";
import type { DashboardSummary } from "@/lib/actions/dashboard";
import { selectionHaptic } from "@/lib/haptics";

const STATS: { key: keyof DashboardSummary; label: string; icon: string; tone: string }[] = [
  { key: "pendingOrders", label: "Pending", icon: "⏳", tone: "text-foreground" },
  { key: "completedOrders", label: "Completed", icon: "✅", tone: "text-emerald-500" },
  { key: "rejectedOrders", label: "Rejected", icon: "⚠️", tone: "text-accent" },
];

/**
 * At-a-glance order counts under the balance. The reason to reopen the app
 * is usually "did my order go through yet?" - answering that on the home
 * screen, instead of only inside /orders, is what makes the dashboard worth
 * returning to.
 */
export function OrderStats({ summary }: { summary: DashboardSummary | null }) {
  return (
    <div className="grid w-full min-w-0 grid-cols-3 gap-2">
      {STATS.map((stat) => (
        <Link
          key={stat.key}
          href="/orders"
          onClick={selectionHaptic}
          className="flex min-w-0 flex-col items-center gap-0.5 rounded-2xl border border-border bg-surface px-2 py-3 shadow-sm transition-transform active:scale-95"
        >
          <span className="text-base" aria-hidden>
            {stat.icon}
          </span>
          <span className={`text-lg font-bold tabular-nums ${stat.tone}`}>
            {summary ? summary[stat.key] : "–"}
          </span>
          <span className="w-full truncate text-center text-[11px] text-hint">{stat.label}</span>
        </Link>
      ))}
    </div>
  );
}
