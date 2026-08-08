"use client";

import Link from "next/link";
import { formatUsd } from "@/lib/ui";
import { impactHaptic, selectionHaptic } from "@/lib/haptics";
import { Icon } from "@/components/ui/icon";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/**
 * The dashboard's opening screen: a personal greeting plus the one number
 * customers open the app to check. Replaces the previous flat surface card -
 * an accent gradient makes the balance the unmistakable focal point instead
 * of one bordered box among several identical ones.
 */
export function BalanceHero({
  firstName,
  balanceCents,
  avatarUrl,
}: {
  firstName: string;
  balanceCents: number;
  avatarUrl: string | null;
}) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-4 rounded-3xl bg-gradient-to-br from-accent via-accent to-accent/60 p-5 text-accent-foreground shadow-lg shadow-accent/25">
      <Link
        href="/settings"
        onClick={selectionHaptic}
        className="flex w-full min-w-0 items-center gap-3 transition-transform active:scale-[0.98]"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- Telegram-hosted profile photo
          <img
            src={avatarUrl}
            alt=""
            className="h-11 w-11 shrink-0 rounded-full object-cover ring-2 ring-white/30"
          />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30">
            <Icon name="user" className="h-6 w-6" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs opacity-80">{greeting()},</p>
          <p className="truncate text-base font-semibold">{firstName}</p>
        </div>
        <Icon name="chevron-right" className="h-5 w-5 shrink-0 opacity-70" />
      </Link>

      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wider opacity-80">Available balance</p>
        <p className="truncate text-3xl font-bold tabular-nums">{formatUsd(balanceCents)}</p>
      </div>

      <div className="flex w-full min-w-0 gap-2">
        <Link
          href="/wallet"
          onClick={() => impactHaptic("light")}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/20 px-4 py-2.5 text-sm font-semibold backdrop-blur transition-transform active:scale-95"
        >
          <Icon name="plus" className="h-4 w-4" /> Add funds
        </Link>
        <Link
          href="/orders"
          onClick={selectionHaptic}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-semibold backdrop-blur transition-transform active:scale-95"
        >
          <Icon name="receipt" className="h-4 w-4" /> My orders
        </Link>
      </div>
    </div>
  );
}
