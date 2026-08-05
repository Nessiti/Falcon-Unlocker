import type { OrderSummary } from "@/lib/actions/orders";

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

function formatUsd(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
}

export function OrderRow({ order }: { order: OrderSummary }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
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

      {order.notes ? <p className="text-xs text-hint">Notes: {order.notes}</p> : null}

      {order.downloadUrl ? (
        <a
          href={order.downloadUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-accent"
        >
          Download result
        </a>
      ) : null}
    </div>
  );
}
