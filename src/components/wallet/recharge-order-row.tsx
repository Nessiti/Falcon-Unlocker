import type { RechargeOrderSummary } from "@/lib/actions/wallet";
import { formatUsd } from "@/lib/ui";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

const STATUS_CLASS: Record<string, string> = {
  PENDING: "bg-surface text-hint",
  APPROVED: "bg-foreground text-background",
  REJECTED: "bg-accent text-accent-foreground",
};

export function RechargeOrderRow({ order }: { order: RechargeOrderSummary }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <div>
        <p className="font-medium text-foreground">
          {formatUsd(order.amountCents)} · {order.methodName}
        </p>
        <p className="text-xs text-hint">{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_CLASS[order.status]}`}
      >
        {STATUS_LABEL[order.status]}
      </span>
    </div>
  );
}
