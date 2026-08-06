import type { OrderSummary } from "@/lib/actions/orders";
import { Markdown } from "@/components/ui/markdown";
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
  PENDING: "bg-surface text-hint",
  CHECKING: "bg-surface text-hint",
  PROCESSING: "bg-surface text-hint",
  COMPLETED: "bg-foreground text-background",
  REJECTED: "bg-accent text-accent-foreground",
  CANCELLED: "bg-accent text-accent-foreground",
};

export function OrderRow({ order, onClick }: { order: OrderSummary; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-left text-sm"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-foreground">{order.serviceName}</span>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[order.status]}`}
        >
          {STATUS_LABEL[order.status]}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-hint">
        <span>#{order.id.slice(0, 8)}</span>
        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
        <span>{formatUsd(order.priceCents)}</span>
        {order.tracking ? <span>Tracking: {order.tracking}</span> : null}
      </div>

      {order.notes ? <Markdown text={order.notes} className="text-xs" /> : null}

      {order.statusHistory.length > 0 ? (
        <p className="text-[11px] text-hint">
          Last update: {STATUS_LABEL[order.statusHistory[order.statusHistory.length - 1].status]} ·{" "}
          {new Date(order.statusHistory[order.statusHistory.length - 1].createdAt).toLocaleString()}
        </p>
      ) : null}

      <span className="text-[11px] font-medium text-accent">View details →</span>
    </button>
  );
}
