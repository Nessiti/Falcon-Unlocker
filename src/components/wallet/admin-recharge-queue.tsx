"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getAdminRechargeQueueAction,
  reviewRechargeOrderAction,
  type AdminRechargeOrderSummary,
} from "@/lib/actions/wallet";
import { formatUsd } from "@/lib/ui";

export function AdminRechargeQueue({ initData }: { initData: string }) {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminRechargeOrderSummary[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminRechargeQueueAction(initData).then((result) => {
      if (!cancelled && result.ok) setOrders(result.orders);
    });
    return () => {
      cancelled = true;
    };
  }, [initData]);

  async function handleReview(id: string, decision: "APPROVED" | "REJECTED") {
    setBusyId(id);
    const result = await reviewRechargeOrderAction(initData, { rechargeOrderId: id, decision });
    setBusyId(null);
    if (result.ok) {
      setOrders((current) => current?.filter((order) => order.id !== id) ?? null);
      router.refresh();
    }
  }

  if (!orders || orders.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Pending Recharge Requests (Admin)</h2>
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
        >
          <div>
            <p className="font-medium text-foreground">
              {order.customerName} · {formatUsd(order.amountCents)} · {order.methodName}
            </p>
            <p className="text-xs text-hint">
              {order.customerUsername ? `@${order.customerUsername}` : `ID ${order.customerTelegramId}`}
            </p>
          </div>
          {order.proofNote ? <p className="text-xs text-hint">Note: {order.proofNote}</p> : null}
          {order.proofUrl ? (
            <a href={order.proofUrl} target="_blank" rel="noreferrer" className="self-start">
              {/* eslint-disable-next-line @next/next/no-img-element -- customer-uploaded proof photo */}
              <img
                src={order.proofUrl}
                alt="Payment proof"
                className="max-h-48 rounded-lg border border-border object-contain"
              />
            </a>
          ) : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={busyId === order.id}
              onClick={() => handleReview(order.id, "APPROVED")}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={busyId === order.id}
              onClick={() => handleReview(order.id, "REJECTED")}
              className="rounded-lg border border-border px-3 py-1.5 text-xs text-foreground disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
