"use client";

import Link from "next/link";
import type { OrderSummary } from "@/lib/actions/orders";
import { formatUsd } from "@/lib/ui";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CHECKING: "Checking",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-background text-hint",
  CHECKING: "bg-background text-hint",
  PROCESSING: "bg-background text-hint",
  COMPLETED: "bg-emerald-500/15 text-emerald-500",
  REJECTED: "bg-accent/15 text-accent",
  CANCELLED: "bg-accent/15 text-accent",
};

export function RecentOrderPreview({ order, onSelect }: { order: OrderSummary | null; onSelect: () => void }) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">Recent Orders</h2>
        <Link href="/orders" className="text-xs font-medium text-accent">
          View all
        </Link>
      </div>

      {order ? (
        <button
          type="button"
          onClick={onSelect}
          className="flex w-full min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left shadow-sm transition-transform active:scale-[0.98]"
        >
          {order.serviceImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- admin-provided service image
            <img
              src={order.serviceImageUrl}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background text-xl">
              {order.kind === "IMEI" ? "📱" : "🖥️"}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{order.serviceName}</p>
            <p className="truncate text-xs text-hint">
              {order.kind === "IMEI" ? "IMEI Order" : "Server Order"}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[order.status]}`}
            >
              {STATUS_LABEL[order.status]}
            </span>
            <span className="text-sm font-semibold text-foreground">{formatUsd(order.priceCents)}</span>
          </div>
        </button>
      ) : (
        <p className="rounded-2xl border border-border bg-surface p-4 text-center text-sm text-hint">
          No orders yet.
        </p>
      )}
    </div>
  );
}
