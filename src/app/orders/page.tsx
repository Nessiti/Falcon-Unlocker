"use client";

import { useEffect, useMemo, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { useTelegramUser } from "@/components/telegram-user-provider";
import { listMyOrdersAction, type OrderSummary } from "@/lib/actions/orders";
import { OrderRow } from "@/components/orders/order-row";
import { OrderDetailModal } from "@/components/orders/order-detail-modal";
import { RowListSkeleton } from "@/components/ui/row-skeleton";
import { formInputClass } from "@/lib/ui";

type Tab = "IMEI" | "SERVER";

const STATUS_OPTIONS = [
  "ALL",
  "PENDING",
  "CHECKING",
  "PROCESSING",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
] as const;

function tabClass(active: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium ${
    active ? "bg-accent text-accent-foreground" : "border border-border text-foreground"
  }`;
}

export default function OrdersPage() {
  const auth = useTelegramUser();
  const initData = useRawInitData();

  const [tab, setTab] = useState<Tab>("IMEI");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>("ALL");
  const [orders, setOrders] = useState<{ imei: OrderSummary[]; server: OrderSummary[] } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<OrderSummary | null>(null);

  useEffect(() => {
    if (auth.status !== "authenticated" || !initData) return;

    let cancelled = false;
    listMyOrdersAction(initData).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setOrders({ imei: result.imei, server: result.server });
      } else {
        setError(result.error);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [auth.status, initData]);

  const list = tab === "IMEI" ? orders?.imei : orders?.server;

  const filtered = useMemo(() => {
    if (!list) return [];
    const query = search.trim().toLowerCase();
    return list.filter((order) => {
      if (status !== "ALL" && order.status !== status) return false;
      if (query && !order.serviceName.toLowerCase().includes(query) && !order.id.includes(query)) {
        return false;
      }
      return true;
    });
  }, [list, search, status]);

  if (auth.status !== "authenticated") return null;

  return (
    <main className="flex flex-1 flex-col gap-4 px-4 py-6 sm:px-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Order History</h1>
        <p className="text-sm text-hint">Your IMEI and Server orders.</p>
      </div>

      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("IMEI")} className={tabClass(tab === "IMEI")}>
          IMEI Orders
        </button>
        <button
          type="button"
          onClick={() => setTab("SERVER")}
          className={tabClass(tab === "SERVER")}
        >
          Server Orders
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          className={`${formInputClass} w-full min-w-0 sm:flex-1`}
          placeholder="Search by service or order ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={`${formInputClass} w-full shrink-0 sm:w-48`}
          value={status}
          onChange={(e) => setStatus(e.target.value as (typeof STATUS_OPTIONS)[number])}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "ALL" ? "All statuses" : option}
            </option>
          ))}
        </select>
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!orders && !error ? (
        <RowListSkeleton className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3" />
      ) : null}
      {orders && filtered.length === 0 ? (
        <p className="text-sm text-hint">No orders found.</p>
      ) : null}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {filtered.map((order) => (
          <OrderRow key={order.id} order={order} onClick={() => setSelected(order)} />
        ))}
      </div>

      {selected ? <OrderDetailModal order={selected} onClose={() => setSelected(null)} /> : null}
    </main>
  );
}
