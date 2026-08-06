"use client";

import Link from "next/link";

/** Shown in place of the order form right after a successful submission. */
export function OrderSuccessScreen({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-background p-4 text-center">
      <span className="text-4xl" aria-hidden>
        ✅
      </span>
      <div>
        <p className="text-sm font-semibold text-foreground">Order placed!</p>
        <p className="mt-1 text-xs text-hint">
          We&apos;ll notify you here as soon as it&apos;s processed.
        </p>
      </div>
      <div className="flex gap-2">
        <Link
          href="/orders"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
        >
          View My Orders
        </Link>
        <button
          type="button"
          onClick={onDone}
          className="rounded-lg border border-border px-4 py-2 text-sm text-foreground"
        >
          Done
        </button>
      </div>
    </div>
  );
}
