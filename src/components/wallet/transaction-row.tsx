import type { WalletTransactionSummary } from "@/lib/actions/wallet";
import { formatUsd } from "@/lib/ui";

export function TransactionRow({ tx }: { tx: WalletTransactionSummary }) {
  const isCredit = tx.type === "CREDIT";

  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <div>
        <p className="font-medium text-foreground">{tx.reason}</p>
        <p className="text-xs text-hint">{new Date(tx.createdAt).toLocaleDateString()}</p>
      </div>
      <span className={`shrink-0 font-semibold ${isCredit ? "text-foreground" : "text-accent"}`}>
        {isCredit ? "+" : "-"}
        {formatUsd(tx.amountCents)}
      </span>
    </div>
  );
}
