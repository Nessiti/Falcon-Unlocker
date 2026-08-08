import type { RechargeOrderSummary } from "@/lib/actions/wallet";
import { StatusPill } from "@/components/ui/status-pill";
import { formatUsd } from "@/lib/ui";

export function RechargeOrderRow({ order }: { order: RechargeOrderSummary }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <div>
        <p className="font-medium text-foreground">
          {formatUsd(order.amountCents)} · {order.methodName}
        </p>
        <p className="text-xs text-hint">{new Date(order.createdAt).toLocaleDateString()}</p>
      </div>
      <StatusPill status={order.status} />
    </div>
  );
}
