"use client";

import Link from "next/link";
import type { DashboardCategory } from "@/lib/actions/dashboard";
import { categoryIcon } from "@/lib/ui";

export function CategoryShortcuts({ categories }: { categories: DashboardCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Categories</h2>
        <Link href="/imei" className="text-xs font-medium text-accent">
          View all
        </Link>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {categories.slice(0, 4).map((category) => (
          <Link
            key={category.id}
            href={category.href}
            className="flex flex-col items-center gap-1.5"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-xl">
              {categoryIcon(category.name)}
            </span>
            <span className="w-full truncate text-center text-[11px] text-foreground">
              {category.name}
            </span>
          </Link>
        ))}
        <Link href="/imei" className="flex flex-col items-center gap-1.5">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border bg-surface text-xl text-hint">
            ···
          </span>
          <span className="w-full truncate text-center text-[11px] text-foreground">More</span>
        </Link>
      </div>
    </div>
  );
}
