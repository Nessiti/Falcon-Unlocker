"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { getAdminDashboardAction, type AdminDashboardStats } from "@/lib/actions/admin-dashboard";
import { HomeCard } from "@/components/dashboard/home-card";
import { formatUsd } from "@/lib/ui";

export default function AdminDashboardPage() {
  const initData = useRawInitData();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    getAdminDashboardAction(initData).then((result) => {
      if (result.ok) setStats(result.stats);
      else setError(result.error);
    });
  }, [initData]);

  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!stats) return <p className="text-sm text-hint">Loading…</p>;

  const cards = [
    { label: "Total Users", value: String(stats.totalUsers) },
    { label: "Pending Orders", value: String(stats.pendingOrders) },
    { label: "Completed Orders", value: String(stats.completedOrders) },
    { label: "Revenue", value: formatUsd(stats.revenueCents) },
    { label: "Pending Recharges", value: String(stats.pendingRecharges) },
    { label: "Open Tickets", value: String(stats.openTickets) },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
      {cards.map((card) => (
        <HomeCard key={card.label} label={card.label} value={card.value} />
      ))}
    </div>
  );
}
