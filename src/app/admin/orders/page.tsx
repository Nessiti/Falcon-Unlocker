"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import {
  listAdminOrdersAction,
  type AdminOrderSummary,
  type OrderKind,
} from "@/lib/actions/admin-orders";
import { AdminOrderRow } from "@/components/admin/admin-order-row";

const KIND_OPTIONS: (OrderKind | "ALL")[] = ["ALL", "IMEI", "SERVER"];

export default function AdminOrdersPage() {
  const initData = useRawInitData();
  const [orders, setOrders] = useState<AdminOrderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [kind, setKind] = useState<OrderKind | "ALL">("ALL");

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

  const filtered = kind === "ALL" ? orders : orders.filter((order) => order.kind === kind);

  return (
    <div className="flex flex-col gap-3">
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

      {filtered.length === 0 ? <p className="text-sm text-hint">No orders.</p> : null}

      {filtered.map((order) => (
        <AdminOrderRow
          key={`${order.kind}-${order.id}`}
          order={order}
          initData={initData}
          onChanged={refresh}
        />
      ))}
    </div>
  );
}
