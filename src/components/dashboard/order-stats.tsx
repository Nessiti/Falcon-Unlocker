"use client";

import Link from "next/link";
import type { DashboardSummary } from "@/lib/actions/dashboard";
import { selectionHaptic } from "@/lib/haptics";
import { Icon } from "@/components/ui/icon";
import { statusTone } from "@/lib/status";

/** Colors come from the shared status palette, so these counts read the
 * same as the pills on the orders they summarize. */
const STATS: { key: keyof DashboardSummary; label: string; status: string }[] = [
  { key: "pendingOrders", label: "Pending", status: "PENDING" },
  { key: "completedOrders", label: "Completed", status: "COMPLETED" },
  { key: "rejectedOrders", label: "Rejected", status: "REJECTED" },
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
      {STATS.map((stat) => {
        const tone = statusTone(stat.status);
        return (
          <Link
            key={stat.key}
            href="/orders"
            onClick={selectionHaptic}
            className="flex min-w-0 flex-col items-center gap-1 rounded-2xl border border-border bg-surface px-2 py-3 shadow-sm transition-transform active:scale-95"
          >
            <span className={`flex h-7 w-7 items-center justify-center rounded-full ${tone.pill}`}>
              <Icon name={tone.icon} className="h-4 w-4" />
            </span>
            <span className={`text-lg font-bold tabular-nums ${tone.text}`}>
              {summary ? summary[stat.key] : "–"}
            </span>
            <span className="w-full truncate text-center text-[11px] text-hint">{stat.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
