"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { getWalletDataAction, type WalletData } from "@/lib/actions/wallet";
import { RechargeMethodCard } from "@/components/wallet/recharge-method-card";
import { RechargeOrderRow } from "@/components/wallet/recharge-order-row";
import { TransactionRow } from "@/components/wallet/transaction-row";
import { AdminRechargeQueue } from "@/components/wallet/admin-recharge-queue";
import { RechargeMethodForm } from "@/components/wallet/recharge-method-form";
import { RechargeMethodManager } from "@/components/wallet/recharge-method-manager";
import { RowListSkeleton } from "@/components/ui/row-skeleton";
import { Role } from "@/generated/prisma/browser";
import { formatUsd } from "@/lib/ui";

export default function WalletPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated" || !initData) return;

    let cancelled = false;
    getWalletDataAction(initData).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setData(result.data);
      } else {
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, initData]);

  if (auth.status !== "authenticated" || !initData) return null;

  const isAdmin = auth.user.role === Role.ADMIN || auth.user.role === Role.SUPER_ADMIN;
  const balanceCents = data?.balanceCents ?? auth.user.balanceCents;

  return (
    <main className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Wallet</h1>
        <p className="text-sm text-hint">Balance, recharge, and transaction history.</p>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs text-hint">Balance</p>
        <p className="text-2xl font-semibold text-foreground">{formatUsd(balanceCents)}</p>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!data && !error ? <RowListSkeleton count={3} className="flex flex-col gap-3" /> : null}

      {isAdmin ? (
        <div className="flex flex-col gap-3">
          <AdminRechargeQueue initData={initData} />
          <RechargeMethodManager initData={initData} />
          <RechargeMethodForm initData={initData} />
        </div>
      ) : null}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recharge</h2>
        {data && data.methods.length === 0 ? (
          <p className="text-sm text-hint">No recharge methods configured yet.</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {data?.methods.map((method) => (
            <RechargeMethodCard key={method.id} method={method} initData={initData} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Recharge Requests</h2>
        {data && data.rechargeOrders.length === 0 ? (
          <p className="text-sm text-hint">No recharge requests yet.</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {data?.rechargeOrders.map((order) => (
            <RechargeOrderRow key={order.id} order={order} />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Transaction History</h2>
        {data && data.transactions.length === 0 ? (
          <p className="text-sm text-hint">No transactions yet.</p>
        ) : null}
        <div className="flex flex-col gap-3">
          {data?.transactions.map((tx) => (
            <TransactionRow key={tx.id} tx={tx} />
          ))}
        </div>
      </div>
    </main>
  );
}
