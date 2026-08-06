"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import {
  sendBroadcastAction,
  listNotificationsAction,
  type BroadcastKind,
  type NotificationSummary,
} from "@/lib/actions/admin-notifications";
import { formInputClass } from "@/lib/ui";

export default function AdminNotificationsPage() {
  const initData = useRawInitData();
  const [kind, setKind] = useState<BroadcastKind>("PROMOTION");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [history, setHistory] = useState<NotificationSummary[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!initData) return;
    listNotificationsAction(initData).then((result) => {
      if (result.ok) setHistory(result.notifications);
      else setHistoryError(result.error);
    });
  }, [initData, refreshKey]);

  if (!initData) return null;
  const verifiedInitData = initData;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    const result = await sendBroadcastAction(verifiedInitData, { kind, title, message });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setMessage("");
    setSuccess(true);
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-sm font-semibold text-foreground">Broadcast Notification</h2>
        <select
          className={formInputClass}
          value={kind}
          onChange={(e) => setKind(e.target.value as BroadcastKind)}
        >
          <option value="PROMOTION">Promotion</option>
          <option value="MAINTENANCE">Maintenance</option>
        </select>
        {kind === "PROMOTION" ? (
          <input
            className={formInputClass}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        ) : null}
        <textarea
          className={formInputClass}
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {success ? <p className="text-sm text-hint">Sent to all users.</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Send to All Users"}
        </button>
      </form>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-foreground">History</h2>
        {historyError ? <p className="text-sm text-accent">{historyError}</p> : null}
        {!history && !historyError ? <p className="text-sm text-hint">Loading…</p> : null}
        {history && history.length === 0 ? (
          <p className="text-sm text-hint">No broadcasts sent yet.</p>
        ) : null}
        {history?.map((n) => (
          <div key={n.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
            <p className="text-foreground">{n.kind === "PROMOTION" ? n.title : "Maintenance"}</p>
            <p className="text-xs text-hint">{n.message}</p>
            <p className="text-xs text-hint">
              {n.recipientCount} recipient{n.recipientCount === 1 ? "" : "s"} · {n.sentByName} ·{" "}
              {new Date(n.createdAt).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
