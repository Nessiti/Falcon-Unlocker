"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  getTicketAction,
  sendTicketMessageAction,
  closeTicketAction,
  type TicketDetail,
} from "@/lib/actions/support-tickets";
import { formInputClass } from "@/lib/ui";

export function TicketThread({
  ticketId,
  initData,
  currentUserId,
  onClose,
}: {
  ticketId: string;
  initData: string;
  currentUserId: string;
  onClose: () => void;
}) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(
    () =>
      getTicketAction(initData, ticketId).then((result) => {
        if (result.ok) setTicket(result.ticket);
        else setError(result.error);
      }),
    [initData, ticketId],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSend(event: FormEvent) {
    event.preventDefault();
    if (!reply.trim()) return;

    setSubmitting(true);
    const result = await sendTicketMessageAction(initData, { ticketId, body: reply });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setReply("");
    await refresh();
  }

  async function handleClose() {
    const result = await closeTicketAction(initData, ticketId);
    if (result.ok) await refresh();
  }

  if (error) return <p className="text-sm text-accent">{error}</p>;
  if (!ticket) return <p className="text-sm text-hint">Loading…</p>;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <button type="button" onClick={onClose} className="text-xs text-hint">
            &larr; Back
          </button>
          <p className="text-sm font-semibold text-foreground">{ticket.subject}</p>
        </div>
        {ticket.status !== "CLOSED" ? (
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            Close ticket
          </button>
        ) : (
          <span className="rounded-full bg-background px-2 py-0.5 text-[11px] text-hint">
            Closed
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {ticket.messages.map((message) => {
          const mine = message.authorId === currentUserId;
          return (
            <div
              key={message.id}
              className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                mine
                  ? "self-end bg-accent text-accent-foreground"
                  : "self-start bg-background text-foreground"
              }`}
            >
              <p>{message.body}</p>
              <p className={`mt-1 text-[10px] ${mine ? "text-accent-foreground/70" : "text-hint"}`}>
                {message.authorName} · {new Date(message.createdAt).toLocaleString()}
              </p>
            </div>
          );
        })}
      </div>

      {ticket.status !== "CLOSED" ? (
        <form onSubmit={handleSend} className="flex gap-2">
          <input
            className={`${formInputClass} flex-1`}
            placeholder="Type a message…"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            Send
          </button>
        </form>
      ) : null}
    </div>
  );
}
