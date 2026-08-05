"use client";

import { useState, type FormEvent } from "react";
import { useRawInitData } from "@telegram-apps/sdk-react";
import { sendBroadcastAction, type BroadcastKind } from "@/lib/actions/admin-notifications";
import { formInputClass } from "@/lib/ui";

export default function AdminNotificationsPage() {
  const initData = useRawInitData();
  const [kind, setKind] = useState<BroadcastKind>("PROMOTION");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
  }

  return (
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
  );
}
