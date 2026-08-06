"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  listProvidersAction,
  getProviderDetailAction,
  setProviderEnabledAction,
  deleteProviderAction,
  testProviderConnectionAction,
  refreshProviderBalanceAction,
  syncProviderAction,
  type ProviderSummary,
  type ProviderDetail,
} from "@/lib/actions/admin-providers";
import { ProviderForm } from "@/components/admin/provider-form";
import { ProviderConnectionHistory } from "@/components/admin/provider-connection-history";
import { formatUsd } from "@/lib/ui";

const TYPE_LABEL: Record<string, string> = {
  DHRU_FUSION: "DHRU Fusion API",
  PHP_API: "PHP API",
  REST_API: "REST API",
  JSON_API: "JSON API",
  XML_API: "XML API",
  CUSTOM_API: "Custom API",
};

const SYNC_FREQUENCY_LABEL: Record<string, string> = {
  MANUAL: "Manual Sync",
  HOURLY: "Every hour",
  EVERY_6_HOURS: "Every 6 hours",
  DAILY: "Daily",
};

export function ProviderManager({ initData }: { initData: string }) {
  const router = useRouter();
  const [providers, setProviders] = useState<ProviderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingProvider, setEditingProvider] = useState<ProviderDetail | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, string>>({});
  const [balanceResult, setBalanceResult] = useState<Record<string, string>>({});
  const [syncResult, setSyncResult] = useState<Record<string, string>>({});

  function refresh() {
    listProvidersAction(initData).then((result) => {
      if (result.ok) setProviders(result.providers);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleToggleEnabled(provider: ProviderSummary) {
    setBusyId(provider.id);
    const result = await setProviderEnabledAction(initData, provider.id, !provider.enabled);
    setBusyId(null);
    if (result.ok) {
      refresh();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleDelete(id: string) {
    setBusyId(id);
    const result = await deleteProviderAction(initData, id);
    setBusyId(null);
    if (result.ok) {
      refresh();
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  async function handleEdit(id: string) {
    setLoadingEditId(id);
    const result = await getProviderDetailAction(initData, id);
    setLoadingEditId(null);
    if (result.ok) setEditingProvider(result.provider);
    else setError(result.error);
  }

  async function handleTestConnection(id: string) {
    setBusyId(id);
    setTestResult((current) => ({ ...current, [id]: "Testing…" }));
    const result = await testProviderConnectionAction(initData, id);
    setBusyId(null);
    if (!result.ok) {
      setTestResult((current) => ({ ...current, [id]: result.error }));
      return;
    }
    setTestResult((current) => ({
      ...current,
      [id]: result.success
        ? `✓ Reachable (${result.responseTimeMs}ms${result.statusCode ? `, HTTP ${result.statusCode}` : ""})`
        : `✗ ${result.errorMessage ?? `HTTP ${result.statusCode}`}`,
    }));
    refresh();
  }

  async function handleRefreshBalance(id: string) {
    setBusyId(id);
    setBalanceResult((current) => ({ ...current, [id]: "Fetching…" }));
    const result = await refreshProviderBalanceAction(initData, id);
    setBusyId(null);
    setBalanceResult((current) => ({
      ...current,
      [id]: result.ok ? `✓ ${formatUsd(result.balanceCents)}` : `✗ ${result.error}`,
    }));
    refresh();
  }

  async function handleSyncNow(id: string) {
    setBusyId(id);
    setSyncResult((current) => ({ ...current, [id]: "Syncing…" }));
    const result = await syncProviderAction(initData, id);
    setBusyId(null);
    if (!result.ok) {
      setSyncResult((current) => ({ ...current, [id]: `✗ ${result.error}` }));
      return;
    }
    const mappingsUpdated = result.imeiMappingsUpdated + result.serverMappingsUpdated;
    setSyncResult((current) => ({
      ...current,
      [id]: `${result.connectionOk ? "✓ Online" : "✗ Offline"} · ${mappingsUpdated} mapping${mappingsUpdated === 1 ? "" : "s"} refreshed${result.balanceUpdated ? " · balance updated" : ""}${result.catalogError ? ` · catalog error: ${result.catalogError}` : ""}`,
    }));
    refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-foreground">Manage Providers (Admin)</h2>
      {error ? <p className="text-xs text-accent">{error}</p> : null}
      {!providers && !error ? <p className="text-sm text-hint">Loading…</p> : null}
      {providers && providers.length === 0 ? (
        <p className="text-sm text-hint">No providers configured yet.</p>
      ) : null}

      {providers?.map((provider) =>
        editingProvider?.id === provider.id ? (
          <ProviderForm
            key={provider.id}
            initData={initData}
            editingProvider={editingProvider}
            onSaved={() => {
              setEditingProvider(null);
              refresh();
            }}
            onCancel={() => setEditingProvider(null)}
          />
        ) : (
          <div
            key={provider.id}
            className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-foreground">{provider.name}</p>
                <p className="text-xs text-hint">
                  {TYPE_LABEL[provider.type]} · Priority {provider.priority} ·{" "}
                  {SYNC_FREQUENCY_LABEL[provider.syncFrequency]}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] ${
                    provider.enabled
                      ? "bg-background text-foreground"
                      : "bg-background text-hint"
                  }`}
                >
                  {provider.enabled ? "Enabled" : "Disabled"}
                </span>
                {provider.lastConnection ? (
                  <span className={`text-[11px] ${provider.lastConnection.success ? "text-foreground" : "text-accent"}`}>
                    {provider.lastConnection.success ? "✓" : "✗"} last test{" "}
                    {new Date(provider.lastConnection.createdAt).toLocaleDateString()}
                  </span>
                ) : null}
              </div>
            </div>

            <p className="truncate text-xs text-hint">{provider.baseUrl}</p>
            <p className="text-xs text-hint">
              Balance:{" "}
              {provider.lastBalanceCents != null
                ? `${formatUsd(provider.lastBalanceCents)}${
                    provider.lastBalanceAt
                      ? ` (as of ${new Date(provider.lastBalanceAt).toLocaleString()})`
                      : ""
                  }`
                : "Not fetched yet"}
            </p>
            <p className="text-xs text-hint">
              Last sync:{" "}
              {provider.lastSyncAt ? new Date(provider.lastSyncAt).toLocaleString() : "Never"}
            </p>

            {testResult[provider.id] ? (
              <p className="text-xs text-hint">{testResult[provider.id]}</p>
            ) : null}
            {balanceResult[provider.id] ? (
              <p className="text-xs text-hint">{balanceResult[provider.id]}</p>
            ) : null}
            {syncResult[provider.id] ? (
              <p className="text-xs text-hint">{syncResult[provider.id]}</p>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={loadingEditId === provider.id}
                onClick={() => handleEdit(provider.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                {loadingEditId === provider.id ? "Loading…" : "Edit"}
              </button>
              <button
                type="button"
                disabled={busyId === provider.id}
                onClick={() => handleTestConnection(provider.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                type="button"
                disabled={busyId === provider.id}
                onClick={() => handleRefreshBalance(provider.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                Refresh Balance
              </button>
              <button
                type="button"
                disabled={busyId === provider.id}
                onClick={() => handleSyncNow(provider.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-foreground disabled:opacity-50"
              >
                Sync Now
              </button>
              <button
                type="button"
                disabled={busyId === provider.id}
                onClick={() => handleToggleEnabled(provider)}
                className={`rounded-lg px-2 py-1 text-xs disabled:opacity-50 ${
                  provider.enabled
                    ? "border border-border text-foreground"
                    : "bg-accent text-accent-foreground"
                }`}
              >
                {provider.enabled ? "Disable" : "Enable"}
              </button>
              <button
                type="button"
                disabled={busyId === provider.id}
                onClick={() => handleDelete(provider.id)}
                className="rounded-lg border border-border px-2 py-1 text-xs text-accent disabled:opacity-50"
              >
                Delete
              </button>
            </div>

            <ProviderConnectionHistory initData={initData} providerId={provider.id} />
          </div>
        ),
      )}
    </div>
  );
}
