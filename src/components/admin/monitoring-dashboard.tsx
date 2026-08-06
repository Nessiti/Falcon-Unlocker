"use client";

import { useEffect, useState } from "react";
import {
  getMonitoringOverviewAction,
  type MonitoringOverview,
} from "@/lib/actions/admin-monitoring";
import { HomeCard } from "@/components/dashboard/home-card";
import { MetricBarChart } from "@/components/admin/metric-bar-chart";
import { formatUsd } from "@/lib/ui";

const POLL_INTERVAL_MS = 20000;

function pct(value: number | null): string {
  return value != null ? `${Math.round(value * 100)}%` : "—";
}

export function MonitoringDashboard({ initData }: { initData: string }) {
  const [overview, setOverview] = useState<MonitoringOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  function refresh() {
    getMonitoringOverviewAction(initData).then((result) => {
      if (result.ok) {
        setOverview(result.overview);
        setLastRefreshed(new Date());
      } else {
        setError(result.error);
      }
    });
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!overview) return <p className="text-sm text-hint">Loading…</p>;

  const { providers, totals } = overview;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-hint">
          Auto-refreshes every 20s{lastRefreshed ? ` · updated ${lastRefreshed.toLocaleTimeString()}` : ""}
        </p>
        <button
          type="button"
          onClick={refresh}
          className="rounded-lg border border-border px-2 py-1 text-xs text-foreground"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <HomeCard label="Providers Online" value={`${totals.onlineCount}/${totals.providerCount}`} />
        <HomeCard label="Active Orders" value={String(totals.activeOrders)} />
        <HomeCard label="Daily Orders" value={String(totals.dailyOrders)} />
        <HomeCard label="Avg Success Rate (24h)" value={pct(totals.avgSuccessRate)} />
      </div>

      {providers.length === 0 ? (
        <p className="text-sm text-hint">No providers configured yet.</p>
      ) : (
        <>
          {/* Mobile: card list. */}
          <div className="flex flex-col gap-2 lg:hidden">
            {providers.map((provider) => (
              <div key={provider.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{provider.name}</span>
                  <span className={provider.online ? "text-foreground" : "text-accent"}>
                    {provider.online == null ? "— No data" : provider.online ? "✓ Online" : "✗ Offline"}
                  </span>
                </div>
                <p className="text-xs text-hint">
                  Success {pct(provider.successRate)} · {provider.failedRequests} failed ·{" "}
                  {provider.avgResponseTimeMs != null ? `${provider.avgResponseTimeMs}ms avg` : "no timing"}
                </p>
                <p className="text-xs text-hint">
                  Active orders {provider.activeOrders} · Daily orders {provider.dailyOrders}
                </p>
                <p className="text-xs text-hint">
                  Balance:{" "}
                  {provider.balanceCents != null ? formatUsd(provider.balanceCents) : "Not fetched"} · Sync:{" "}
                  {provider.syncDue ? "Due" : "Up to date"}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop: dense table. */}
          <div className="hidden overflow-x-auto rounded-2xl border border-border lg:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-background text-xs text-hint">
                  <th className="px-4 py-3 font-medium">Provider</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Success Rate</th>
                  <th className="px-4 py-3 font-medium">Failed</th>
                  <th className="px-4 py-3 font-medium">Avg Response</th>
                  <th className="px-4 py-3 font-medium">Active Orders</th>
                  <th className="px-4 py-3 font-medium">Daily Orders</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Sync</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((provider) => (
                  <tr key={provider.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-foreground">{provider.name}</td>
                    <td className={provider.online ? "px-4 py-3 text-foreground" : "px-4 py-3 text-accent"}>
                      {provider.online == null ? "—" : provider.online ? "✓ Online" : "✗ Offline"}
                    </td>
                    <td className="px-4 py-3 text-hint">{pct(provider.successRate)}</td>
                    <td className="px-4 py-3 text-hint">{provider.failedRequests}</td>
                    <td className="px-4 py-3 text-hint">
                      {provider.avgResponseTimeMs != null ? `${provider.avgResponseTimeMs}ms` : "—"}
                    </td>
                    <td className="px-4 py-3 text-hint">{provider.activeOrders}</td>
                    <td className="px-4 py-3 text-hint">{provider.dailyOrders}</td>
                    <td className="px-4 py-3 text-hint">
                      {provider.balanceCents != null ? formatUsd(provider.balanceCents) : "—"}
                    </td>
                    <td className={provider.syncDue ? "px-4 py-3 text-accent" : "px-4 py-3 text-hint"}>
                      {provider.syncDue ? "Due" : "Up to date"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <MetricBarChart
              title="Success Rate (24h)"
              data={providers
                .filter((p) => p.successRate != null)
                .map((p) => ({ label: p.name, value: Math.round((p.successRate ?? 0) * 100) }))}
              formatValue={(value) => `${value}%`}
            />
            <MetricBarChart
              title="Error Rate (24h)"
              data={providers
                .filter((p) => p.successRate != null)
                .map((p) => ({ label: p.name, value: Math.round((1 - (p.successRate ?? 0)) * 100) }))}
              formatValue={(value) => `${value}%`}
            />
            <MetricBarChart
              title="Response Time (24h avg)"
              data={providers
                .filter((p) => p.avgResponseTimeMs != null)
                .map((p) => ({ label: p.name, value: p.avgResponseTimeMs ?? 0 }))}
              formatValue={(value) => `${value}ms`}
            />
            <MetricBarChart
              title="Orders per Provider (today)"
              data={providers.map((p) => ({ label: p.name, value: p.dailyOrders }))}
              formatValue={(value) => String(value)}
            />
          </div>
        </>
      )}
    </div>
  );
}
