"use client";

import Link from "next/link";
import type { DashboardCategory } from "@/lib/actions/dashboard";
import { categoryIcon } from "@/lib/ui";
import { selectionHaptic } from "@/lib/haptics";
import { Icon } from "@/components/ui/icon";

/**
 * Shortcuts to the tenant's top categories. Deliberately built from the
 * same pieces as MobileQuickActions (surface card, 4-column grid, tinted
 * rounded icon tile) - it sits directly above that block on the dashboard,
 * so anything else reads as a different design language rather than the
 * same app. The header's "View all" covers overflow, so there's no separate
 * "More" tile competing with it.
 */
export function CategoryShortcuts({ categories }: { categories: DashboardCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Categories</h2>
        <Link href="/imei" onClick={selectionHaptic} className="text-xs font-medium text-accent">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm">
        {categories.slice(0, 8).map((category) => (
          <Link
            key={category.id}
            href={category.href}
            onClick={selectionHaptic}
            className="flex min-w-0 flex-col items-center gap-1.5 transition-transform active:scale-95"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <Icon name={categoryIcon(category.name)} />
            </span>
            <span className="w-full truncate text-center text-[11px] text-foreground">
              {category.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
