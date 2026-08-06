"use client";

import { useEffect, useState } from "react";
import {
  listCronRunLogsAction,
  runCronNowAction,
  type CronRunLogSummary,
} from "@/lib/actions/admin-cron";
import type { CronRunSummary } from "@/lib/cron/runner";

export function CronLogManager({ initData }: { initData: string }) {
  const [logs, setLogs] = useState<CronRunLogSummary[] | null>(null);
  const [taskNames, setTaskNames] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [running, setRunning] = useState(false);
  const [runResults, setRunResults] = useState<CronRunSummary[] | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  function refresh() {
    listCronRunLogsAction(initData).then((result) => {
      if (result.ok) {
        setLogs(result.logs);
        setTaskNames(result.taskNames);
      } else {
        setError(result.error);
      }
    });
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleRunNow() {
    setRunning(true);
    setRunError(null);
    setRunResults(null);
    const result = await runCronNowAction(initData);
    setRunning(false);
    if (result.ok) {
      setRunResults(result.results);
      refresh();
    } else {
      setRunError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 text-sm">
        <p className="font-semibold text-foreground">Registered Tasks</p>
        <p className="text-xs text-hint">
          {taskNames.length > 0 ? taskNames.join(", ") : "—"} · triggered externally via
          Authorization: Bearer &lt;CRON_SECRET&gt; on GET/POST /api/cron
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={running}
            onClick={handleRunNow}
            className="self-start rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground disabled:opacity-50"
          >
            {running ? "Running…" : "Run Now"}
          </button>
        </div>
        {runError ? <p className="text-xs text-accent">{runError}</p> : null}
        {runResults ? (
          <div className="flex flex-col gap-1">
            {runResults.map((result) => (
              <p key={result.task} className={result.success ? "text-xs text-foreground" : "text-xs text-accent"}>
                {result.success ? "✓" : "✗"} {result.task} ({result.durationMs}ms)
                {result.detail ? ` · ${result.detail}` : ""}
                {result.error ? ` · ${result.error}` : ""}
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {!logs && !error ? <p className="text-sm text-hint">Loading…</p> : null}
      {logs && logs.length === 0 ? (
        <p className="text-sm text-hint">No cron runs logged yet.</p>
      ) : null}

      <div className="flex flex-col gap-2">
        {logs?.map((log) => (
          <div
            key={log.id}
            className="flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4 text-sm"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground">{log.task}</span>
              <span className={log.success ? "text-foreground" : "text-accent"}>
                {log.success ? "✓ Success" : "✗ Failed"}
              </span>
            </div>
            <p className="text-xs text-hint">
              {new Date(log.startedAt).toLocaleString()} · {log.durationMs}ms
            </p>
            {log.detail ? <p className="text-xs text-hint">{log.detail}</p> : null}
            {log.error ? <p className="text-xs text-accent">{log.error}</p> : null}
          </div>
        ))}
      </div>
    </div>
  );
}
