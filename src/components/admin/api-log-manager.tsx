"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  listApiLogsAction,
  getApiLogDetailAction,
  exportApiLogsAction,
  retryApiLogAction,
  type ApiLogSummary,
  type ApiLogDetail,
} from "@/lib/actions/admin-api-logs";
import { listProvidersAction, type ProviderSummary } from "@/lib/actions/admin-providers";
import { formInputClass } from "@/lib/ui";

const OPERATION_OPTIONS = [
  "testConnection",
  "getBalance",
  "getServices",
  "submitOrder",
  "checkOrderStatus",
  "cancelOrder",
] as const;

const RETRYABLE_OPERATIONS = new Set<string>(["testConnection", "getBalance", "getServices"]);

function downloadCsv(csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `api-logs-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function ApiLogManager({ initData }: { initData: string }) {
  const [logs, setLogs] = useState<ApiLogSummary[] | null>(null);
  const [providers, setProviders] = useState<ProviderSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [providerId, setProviderId] = useState("");
  const [operation, setOperation] = useState("");
  const [successFilter, setSuccessFilter] = useState<"" | "true" | "false">("");

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApiLogDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [retryResult, setRetryResult] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  function refresh() {
    listApiLogsAction(initData, {
      search: search || undefined,
      providerId: providerId || undefined,
      operation: operation || undefined,
      success: successFilter === "" ? undefined : successFilter === "true",
    }).then((result) => {
      if (result.ok) setLogs(result.logs);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, providerId, operation, successFilter]);

  useEffect(() => {
    listProvidersAction(initData).then((result) => {
      if (result.ok) setProviders(result.providers);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(event: FormEvent) {
    event.preventDefault();
    setSearch(searchInput.trim());
  }

  async function handleToggleExpand(log: ApiLogSummary) {
    if (expandedId === log.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(log.id);
    setDetail(null);
    setLoadingDetail(true);
    const result = await getApiLogDetailAction(initData, log.id);
    setLoadingDetail(false);
    if (result.ok) setDetail(result.log);
  }

  async function handleRetry(log: ApiLogSummary) {
    setBusyId(log.id);
    setRetryResult((current) => ({ ...current, [log.id]: "Retrying…" }));
    const result = await retryApiLogAction(initData, log.id);
    setBusyId(null);
    setRetryResult((current) => ({
      ...current,
      [log.id]: result.ok ? "✓ Retried — see the newest log entry" : `✗ ${result.error}`,
    }));
    if (result.ok) refresh();
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    const result = await exportApiLogsAction(initData, {
      search: search || undefined,
      providerId: providerId || undefined,
      operation: operation || undefined,
      success: successFilter === "" ? undefined : successFilter === "true",
    });
    setExporting(false);
    if (result.ok) downloadCsv(result.csv);
    else setExportError(result.error);
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-2">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search endpoint or error message…"
          className={`${formInputClass} min-w-0 flex-1`}
        />
        <select
          value={providerId}
          onChange={(e) => setProviderId(e.target.value)}
          className={`${formInputClass} w-full shrink-0 sm:w-44`}
        >
          <option value="">All providers</option>
          {providers?.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.name}
            </option>
          ))}
        </select>
        <select
          value={operation}
          onChange={(e) => setOperation(e.target.value)}
          className={`${formInputClass} w-full shrink-0 sm:w-44`}
        >
          <option value="">All operations</option>
          {OPERATION_OPTIONS.map((op) => (
            <option key={op} value={op}>
              {op}
            </option>
          ))}
        </select>
        <select
          value={successFilter}
          onChange={(e) => setSuccessFilter(e.target.value as "" | "true" | "false")}
          className={`${formInputClass} w-full shrink-0 sm:w-36`}
        >
          <option value="">All results</option>
          <option value="true">Success only</option>
          <option value="false">Failed only</option>
        </select>
        <button
          type="button"
          disabled={exporting}
          onClick={handleExport}
          className="shrink-0 rounded-lg border border-border px-3 py-2 text-sm text-foreground disabled:opacity-50"
        >
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </form>
      {exportError ? <p className="text-xs text-accent">{exportError}</p> : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!logs && !error ? <p className="text-sm text-hint">Loading…</p> : null}
      {logs && logs.length === 0 ? <p className="text-sm text-hint">No API calls logged yet.</p> : null}

      <div className="flex flex-col gap-2">
        {logs?.map((log) => (
          <div key={log.id} className="rounded-2xl border border-border bg-surface text-sm">
            <button
              type="button"
              onClick={() => handleToggleExpand(log)}
              className="flex w-full flex-col gap-1 p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {log.providerName} · {log.operation}
                </span>
                <span className={log.success ? "text-foreground" : "text-accent"}>
                  {log.success ? "✓" : "✗"} {log.statusCode ?? "—"}
                </span>
              </div>
              <p className="truncate text-xs text-hint">
                {log.method} {log.endpoint}
              </p>
              <p className="text-xs text-hint">
                {new Date(log.createdAt).toLocaleString()} · {log.responseTimeMs}ms
                {log.errorMessage ? ` · ${log.errorMessage}` : ""}
              </p>
            </button>

            {expandedId === log.id ? (
              <div className="flex flex-col gap-2 border-t border-border p-4 text-xs">
                {loadingDetail ? (
                  <p className="text-hint">Loading…</p>
                ) : detail ? (
                  <>
                    <div>
                      <p className="font-semibold text-foreground">Request</p>
                      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-background p-2 text-hint">
                        {detail.requestBody ?? "(no body)"}
                      </pre>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Response</p>
                      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-background p-2 text-hint">
                        {detail.responseBody ?? "(no body)"}
                      </pre>
                    </div>
                  </>
                ) : (
                  <p className="text-hint">Failed to load detail.</p>
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === log.id || !RETRYABLE_OPERATIONS.has(log.operation)}
                    onClick={() => handleRetry(log)}
                    className="rounded-lg border border-border px-2 py-1 text-foreground disabled:opacity-50"
                    title={
                      RETRYABLE_OPERATIONS.has(log.operation)
                        ? undefined
                        : "Order operations aren't safely auto-retryable — see Chapter 18"
                    }
                  >
                    Retry Request
                  </button>
                  {retryResult[log.id] ? <span className="text-hint">{retryResult[log.id]}</span> : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
