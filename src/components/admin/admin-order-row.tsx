"use client";

import { useState } from "react";
import { updateOrderStatusAction, type AdminOrderSummary } from "@/lib/actions/admin-orders";
import { OrderStatus } from "@/generated/prisma/browser";
import { formatUsd, formInputClass } from "@/lib/ui";

const STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CHECKING,
  OrderStatus.PROCESSING,
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
  OrderStatus.CANCELLED,
];

export function AdminOrderRow({
  order,
  initData,
  onChanged,
}: {
  order: AdminOrderSummary;
  initData: string;
  onChanged: () => void;
}) {
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleApply() {
    setBusy(true);
    setError(null);
    const result = await updateOrderStatusAction(initData, {
      orderId: order.id,
      kind: order.kind,
      status,
      comment: comment.trim() || null,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setComment("");
    onChanged();
  }

  const noChange = status === order.status && !comment.trim();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">
            {order.customerName} · {order.serviceName}
          </p>
          <p className="text-xs text-hint">
            {order.kind} · #{order.id.slice(0, 8)} · {formatUsd(order.priceCents)} ·{" "}
            {new Date(order.createdAt).toLocaleDateString()}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[11px] text-hint">
          {order.status}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        <select
          className={`${formInputClass} w-auto`}
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          className={`${formInputClass} flex-1`}
          placeholder="Comment (optional)"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || noChange}
          onClick={handleApply}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
        >
          Update
        </button>
      </div>

      {error ? <p className="text-xs text-accent">{error}</p> : null}
    </div>
  );
}
