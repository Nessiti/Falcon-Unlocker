"use client";

import { useState } from "react";
import {
  listProviderConnectionLogsAction,
  type ProviderConnectionLogSummary,
} from "@/lib/actions/admin-providers";

export function ProviderConnectionHistory({
  initData,
  providerId,
}: {
  initData: string;
  providerId: string;
}) {
  const [logs, setLogs] = useState<ProviderConnectionLogSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  async function handleToggle() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    const result = await listProviderConnectionLogsAction(initData, providerId);
    if (result.ok) setLogs(result.logs);
    else setError(result.error);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handleToggle}
        className="self-start text-xs text-hint underline"
      >
        {open ? "Hide history" : "View connection history"}
      </button>
      {open ? (
        <div className="flex flex-col gap-1 rounded-lg bg-background p-2 text-xs">
          {error ? <p className="text-accent">{error}</p> : null}
          {!logs && !error ? <p className="text-hint">Loading…</p> : null}
          {logs && logs.length === 0 ? <p className="text-hint">No connection tests yet.</p> : null}
          {logs?.map((log) => (
            <div
              key={log.id}
              className="flex items-center justify-between gap-2 border-b border-border pb-1 last:border-0"
            >
              <span className={log.success ? "text-foreground" : "text-accent"}>
                {log.success ? "✓ Success" : "✗ Failed"}
                {log.statusCode ? ` (${log.statusCode})` : ""}
                {log.errorMessage ? ` — ${log.errorMessage}` : ""}
              </span>
              <span className="shrink-0 text-hint">
                {log.responseTimeMs != null ? `${log.responseTimeMs}ms · ` : ""}
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
