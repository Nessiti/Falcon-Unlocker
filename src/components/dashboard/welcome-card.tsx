"use client";

import Link from "next/link";
import { formatUsd } from "@/lib/ui";

export function WelcomeCard({
  firstName,
  balanceCents,
  logoUrl,
}: {
  firstName: string;
  balanceCents: number;
  logoUrl: string | null;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <Link href="/settings" className="flex items-center gap-3 rounded-xl transition-colors active:bg-background">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- tenant-hosted logo
          <img
            src={logoUrl}
            alt=""
            className="h-12 w-12 shrink-0 rounded-full object-cover ring-2 ring-accent/20"
          />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-background text-2xl ring-2 ring-accent/20">
            🦅
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-hint">Welcome back,</p>
          <p className="truncate text-lg font-semibold text-foreground">{firstName}</p>
        </div>
        <span aria-hidden className="shrink-0 text-lg text-hint">
          ›
        </span>
      </Link>

      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-hint">Balance</p>
          <p className="truncate text-2xl font-semibold text-foreground">{formatUsd(balanceCents)}</p>
        </div>
        <Link
          href="/wallet"
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition-transform active:scale-95"
        >
          + Add
        </Link>
      </div>
    </div>
  );
}
