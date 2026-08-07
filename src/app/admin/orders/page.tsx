"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import {
  listAdminOrdersAction,
  type AdminOrderSummary,
  type OrderKind,
} from "@/lib/actions/admin-orders";
import { AdminOrderRow } from "@/components/admin/admin-order-row";
import { OrderStatus } from "@/generated/prisma/browser";

const KIND_OPTIONS: (OrderKind | "ALL")[] = ["ALL", "IMEI", "SERVER"];

// Orders still needing admin attention vs. orders already resolved
// one way or another - kept apart so treated orders don't clutter
// the queue of new ones.
const ACTIVE_STATUSES: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.CHECKING,
  OrderStatus.PROCESSING,
];
const PROCESSED_STATUSES: OrderStatus[] = [
  OrderStatus.COMPLETED,
  OrderStatus.REJECTED,
  OrderStatus.CANCELLED,
];

type ViewTab = "ACTIVE" | "PROCESSED";

export default function AdminOrdersPage() {
  const initData = useRawInitData();
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<OrderKind | "ALL">("ALL");
  const [tab, setTab] = useState<ViewTab>("ACTIVE");

  function refresh() {
    if (!initData) return;
    listAdminOrdersAction(initData).then((result) => {
      if (result.ok) setOrders(result.orders);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  if (!initData) return null;
  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!orders) return <p className="text-sm text-hint">Loading…</p>;

  const statusSet = tab === "ACTIVE" ? ACTIVE_STATUSES : PROCESSED_STATUSES;
  const activeCount = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;
  const filtered = orders.filter(
    (order) => statusSet.includes(order.status) && (kind === "ALL" || order.kind === kind),
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("ACTIVE")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "ACTIVE"
              ? "bg-accent text-accent-foreground"
              : "border border-border text-foreground"
          }`}
        >
          New / Active{activeCount > 0 ? ` (${activeCount})` : ""}
        </button>
        <button
          type="button"
          onClick={() => setTab("PROCESSED")}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
            tab === "PROCESSED"
              ? "bg-accent text-accent-foreground"
              : "border border-border text-foreground"
          }`}
        >
          Processed
        </button>
      </div>

      <div className="flex gap-2">
        {KIND_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setKind(option)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              kind === option
                ? "bg-accent text-accent-foreground"
                : "border border-border text-foreground"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-hint">
          {tab === "ACTIVE" ? "No new orders." : "No processed orders."}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {filtered.map((order) => (
          <AdminOrderRow
            key={`${order.kind}-${order.id}`}
            order={order}
            initData={initData}
            onChanged={refresh}
          />
        ))}
      </div>
    </div>
  );
}
