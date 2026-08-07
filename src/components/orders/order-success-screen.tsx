"use client";

import { useEffect } from "react";
import Link from "next/link";
import { playOrderSuccessSound } from "@/lib/sound";

/**
 * Full-screen celebration shown right after an order is placed - haptic
 * feedback already fired at the call site (right when the server confirmed
 * success), this adds the matching sound and visual so the moment reads as
 * a single native-feeling event instead of a form just quietly resetting.
 */
export function OrderSuccessScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    playOrderSuccessSound();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex w-full min-w-0 flex-col items-center justify-center gap-6 bg-background/97 px-6 text-center backdrop-blur-sm animate-order-success-backdrop">
      <span className="relative flex h-24 w-24 shrink-0 items-center justify-center" aria-hidden>
        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-order-success-ring" />
        <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-order-success-ring [animation-delay:0.35s]" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 text-4xl text-white shadow-lg shadow-emerald-500/40 animate-order-success-pop">
          ✓
        </span>
      </span>
      <div className="w-full min-w-0 max-w-xs animate-order-success-rise">
        <p className="text-lg font-semibold text-foreground">Order placed!</p>
        <p className="mt-1 text-sm text-hint">
          We&apos;ll notify you here as soon as it&apos;s processed.
        </p>
      </div>
      <div className="flex w-full max-w-xs min-w-0 gap-2 animate-order-success-rise">
        <Link
          href="/orders"
          onClick={onDone}
          className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-sm transition-transform active:scale-95"
        >
          View My Orders
        </Link>
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground transition-transform active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
