"use client";

import { useEffect, useState } from "react";
import {
  listQueueEntriesAction,
  getQueueEntryDetailAction,
  cancelQueueEntryAction,
  retryQueueEntryAction,
  processQueueNowAction,
  getQueueSettingsAction,
  updateQueueSettingsAction,
  type QueueEntrySummary,
  type QueueEntryDetail,
} from "@/lib/actions/admin-queue";
import { formInputClass } from "@/lib/ui";

const STATUS_LABEL: Record<string, string> = {
  QUEUED: "Queued",
  PROCESSING: "Processing",
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

function statusClass(status: string): string {
  if (status === "SUCCEEDED") return "text-foreground";
  if (status === "FAILED" || status === "CANCELLED") return "text-accent";
  return "text-hint";
}

export function QueueManager({ initData }: { initData: string }) {
  const [entries, setEntries] = useState<QueueEntrySummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionResult, setActionResult] = useState<Record<string, string>>({});

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<QueueEntryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [maxRetries, setMaxRetries] = useState("3");
  const [retryDelaySeconds, setRetryDelaySeconds] = useState("60");
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [processing, setProcessing] = useState(false);
  const [processResult, setProcessResult] = useState<string | null>(null);

  function refresh() {
    listQueueEntriesAction(initData).then((result) => {
      if (result.ok) setEntries(result.entries);
      else setError(result.error);
    });
  }

  useEffect(() => {
    refresh();
    getQueueSettingsAction(initData).then((result) => {
      if (result.ok) {
        setMaxRetries(String(result.settings.maxRetries));
        setRetryDelaySeconds(String(result.settings.retryDelaySeconds));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleSaveSettings() {
    setSavingSettings(true);
    setSettingsSaved(false);
    const result = await updateQueueSettingsAction(initData, {
      maxRetries: Number(maxRetries),
      retryDelaySeconds: Number(retryDelaySeconds),
    });
    setSavingSettings(false);
    if (result.ok) setSettingsSaved(true);
    else setError(result.error);
  }

  async function handleProcessNow() {
    setProcessing(true);
    setProcessResult(null);
    const result = await processQueueNowAction(initData);
    setProcessing(false);
    if (result.ok) {
      setProcessResult(
        `Checked ${result.summary.checked} · ${result.summary.succeeded} succeeded · ${result.summary.requeued} requeued · ${result.summary.failed} failed`,
      );
      refresh();
    } else {
      setProcessResult(`Failed: ${result.error}`);
    }
  }

  async function handleToggleExpand(entry: QueueEntrySummary) {
    if (expandedId === entry.id) {
      setExpandedId(null);
      setDetail(null);
      return;
    }
    setExpandedId(entry.id);
    setDetail(null);
    setLoadingDetail(true);
    const result = await getQueueEntryDetailAction(initData, entry.id);
    setLoadingDetail(false);
    if (result.ok) setDetail(result.entry);
  }

  async function handleCancel(entry: QueueEntrySummary) {
    setBusyId(entry.id);
    const result = await cancelQueueEntryAction(initData, entry.id);
    setBusyId(null);
    setActionResult((current) => ({
      ...current,
      [entry.id]: result.ok ? "✓ Cancelled" : `✗ ${result.error}`,
    }));
    if (result.ok) refresh();
  }

  async function handleRetry(entry: QueueEntrySummary) {
    setBusyId(entry.id);
    setActionResult((current) => ({ ...current, [entry.id]: "Retrying…" }));
    const result = await retryQueueEntryAction(initData, entry.id);
    setBusyId(null);
    setActionResult((current) => ({
      ...current,
      [entry.id]: result.ok ? `✓ Retried — ${result.outcome ?? "no change"}` : `✗ ${result.error}`,
    }));
    if (result.ok) refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-semibold text-foreground">Retry Configuration</p>
        <p className="text-xs text-hint">
          Applies to newly queued orders — entries already in progress keep the budget they were
          queued with. Timeout is configured per provider (Admin → Providers).
        </p>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-xs text-hint">
            Maximum Retries
            <input
              type="number"
              min="0"
              value={maxRetries}
              onChange={(e) => setMaxRetries(e.target.value)}
              className={formInputClass}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-hint">
            Retry Delay (seconds)
            <input
              type="number"
              min="0"
              value={retryDelaySeconds}
              onChange={(e) => setRetryDelaySeconds(e.target.value)}
              className={formInputClass}
            />
          </label>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={savingSettings}
            onClick={handleSaveSettings}
            className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            {savingSettings ? "Saving…" : "Save Settings"}
          </button>
          {settingsSaved ? <span className="text-xs text-hint">✓ Saved</span> : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={processing}
          onClick={handleProcessNow}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground disabled:opacity-50"
        >
          {processing ? "Processing…" : "Process Queue Now"}
        </button>
        {processResult ? <span className="text-xs text-hint">{processResult}</span> : null}
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!entries && !error ? <p className="text-sm text-hint">Loading…</p> : null}
      {entries && entries.length === 0 ? (
        <p className="text-sm text-hint">No orders in the queue yet.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {entries?.map((entry) => (
          <div key={entry.id} className="rounded-2xl border border-border bg-surface text-sm">
            <button
              type="button"
              onClick={() => handleToggleExpand(entry)}
              className="flex w-full flex-col gap-1 p-4 text-left"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {entry.kind} · {entry.serviceName}
                </span>
                <span className={statusClass(entry.status)}>{STATUS_LABEL[entry.status] ?? entry.status}</span>
              </div>
              <p className="text-xs text-hint">{entry.customerName}</p>
              <p className="text-xs text-hint">
                Attempt {entry.attempts}/{entry.maxRetries}
                {entry.currentProviderName ? ` · ${entry.currentProviderName}` : ""}
                {entry.status === "QUEUED"
                  ? ` · next try ${new Date(entry.nextAttemptAt).toLocaleString()}`
                  : ""}
              </p>
              {entry.lastError ? <p className="text-xs text-accent">{entry.lastError}</p> : null}
            </button>

            {expandedId === entry.id ? (
              <div className="flex flex-col gap-2 border-t border-border p-4 text-xs">
                {loadingDetail ? (
                  <p className="text-hint">Loading…</p>
                ) : detail ? (
                  detail.attemptLogs.length === 0 ? (
                    <p className="text-hint">No attempts yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold text-foreground">Attempt History</p>
                      {detail.attemptLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-center justify-between rounded border border-border bg-background px-2 py-1"
                        >
                          <span className={log.success ? "text-foreground" : "text-accent"}>
                            {log.success ? "✓" : "✗"} {log.providerName}
                          </span>
                          <span className="text-hint">
                            {new Date(log.createdAt).toLocaleString()}
                            {log.errorMessage ? ` · ${log.errorMessage}` : ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  )
                ) : (
                  <p className="text-hint">Failed to load detail.</p>
                )}
                {entry.providerOrderId ? (
                  <p className="text-hint">Provider order ID: {entry.providerOrderId}</p>
                ) : null}

                <div className="flex items-center gap-2">
                  {entry.status === "QUEUED" || entry.status === "PROCESSING" ? (
                    <button
                      type="button"
                      disabled={busyId === entry.id}
                      onClick={() => handleCancel(entry)}
                      className="rounded-lg border border-border px-2 py-1 text-accent disabled:opacity-50"
                    >
                      Cancel
                    </button>
                  ) : null}
                  {entry.status === "FAILED" || entry.status === "CANCELLED" ? (
                    <button
                      type="button"
                      disabled={busyId === entry.id}
                      onClick={() => handleRetry(entry)}
                      className="rounded-lg border border-border px-2 py-1 text-foreground disabled:opacity-50"
                    >
                      Manual Retry
                    </button>
                  ) : null}
                  {actionResult[entry.id] ? (
                    <span className="text-hint">{actionResult[entry.id]}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
