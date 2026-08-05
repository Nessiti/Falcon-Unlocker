"use client";

import { useEffect, useState } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { listAuditLogsAction, type AuditLogSummary } from "@/lib/actions/admin-logs";

export default function AdminLogsPage() {
  const initData = useRawInitData();
  const [logs, setLogs] = useState<AuditLogSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!initData) return;
    listAuditLogsAction(initData).then((result) => {
      if (result.ok) setLogs(result.logs);
      else setError(result.error);
    });
  }, [initData]);

  if (!initData) return null;
  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!logs) return <p className="text-sm text-hint">Loading…</p>;
  if (logs.length === 0) return <p className="text-sm text-hint">No activity yet.</p>;

  return (
    <div className="flex flex-col gap-2">
      {logs.map((log) => (
        <div key={log.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="text-foreground">{log.action}</p>
          {log.details ? <p className="text-xs text-hint">{log.details}</p> : null}
          <p className="text-xs text-hint">
            {log.actorName} · {new Date(log.createdAt).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  );
}
