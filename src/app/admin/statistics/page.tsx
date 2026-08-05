"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { getAdminStatisticsAction, type AdminStatistics } from "@/lib/actions/admin-dashboard";
import { formatUsd } from "@/lib/ui";

export default function AdminStatisticsPage() {
  const initData = useRawInitData();
  const [stats, setStats] = useState<AdminStatistics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    getAdminStatisticsAction(initData).then((result) => {
      if (result.ok) setStats(result.stats);
      else setError(result.error);
    });
  }, [initData]);

  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!stats) return <p className="text-sm text-hint">Loading…</p>;

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Users by Role</h2>
        {stats.usersByRole.map((row) => (
          <p key={row.role} className="text-sm text-hint">
            {row.role}: {row.count}
          </p>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">IMEI Orders by Status</h2>
        {stats.imeiOrdersByStatus.map((row) => (
          <p key={row.status} className="text-sm text-hint">
            {row.status}: {row.count}
          </p>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Server Orders by Status</h2>
        {stats.serverOrdersByStatus.map((row) => (
          <p key={row.status} className="text-sm text-hint">
            {row.status}: {row.count}
          </p>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-surface p-4">
        <h2 className="mb-2 text-sm font-semibold text-foreground">Totals</h2>
        <p className="text-sm text-hint">Revenue: {formatUsd(stats.totalRevenueCents)}</p>
        <p className="text-sm text-hint">
          Wallet Credited: {formatUsd(stats.totalWalletCreditedCents)}
        </p>
      </section>
    </div>
  );
}
