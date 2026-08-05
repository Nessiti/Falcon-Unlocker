"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listMyTicketsAction,
  getAdminTicketQueueAction,
  createTicketAction,
  type TicketSummary,
  type AdminTicketSummary,
} from "@/lib/actions/support-tickets";
import { TicketThread } from "@/components/support/ticket-thread";
import { formInputClass } from "@/lib/ui";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  CLOSED: "Closed",
};

export function TicketsTab({
  initData,
  currentUserId,
  isAdmin,
}: {
  initData: string;
  currentUserId: string;
  isAdmin: boolean;
}) {
  const [myTickets, setMyTickets] = useState<TicketSummary[] | null>(null);
  const [adminTickets, setAdminTickets] = useState<AdminTicketSummary[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshLists = useCallback(async () => {
    listMyTicketsAction(initData).then((result) => {
      if (result.ok) setMyTickets(result.tickets);
    });
    if (isAdmin) {
      getAdminTicketQueueAction(initData).then((result) => {
        if (result.ok) setAdminTickets(result.tickets);
      });
    }
  }, [initData, isAdmin]);

  useEffect(() => {
    refreshLists();
  }, [refreshLists]);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createTicketAction(initData, { subject, message });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    setSubject("");
    setMessage("");
    await refreshLists();
    setSelectedId(result.ticketId);
  }

  if (selectedId) {
    return (
      <TicketThread
        ticketId={selectedId}
        initData={initData}
        currentUserId={currentUserId}
        onClose={() => {
          setSelectedId(null);
          refreshLists();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={handleCreate}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-sm font-semibold text-foreground">New ticket</h2>
        <input
          className={formInputClass}
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
        />
        <textarea
          className={formInputClass}
          placeholder="How can we help?"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        {error ? <p className="text-xs text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting ? "Sending…" : "Open ticket"}
        </button>
      </form>

      <div>
        <h2 className="mb-2 text-sm font-semibold text-foreground">My Tickets</h2>
        {myTickets && myTickets.length === 0 ? (
          <p className="text-sm text-hint">No tickets yet.</p>
        ) : null}
        <div className="flex flex-col gap-2">
          {myTickets?.map((ticket) => (
            <button
              key={ticket.id}
              type="button"
              onClick={() => setSelectedId(ticket.id)}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-left text-sm"
            >
              <span className="text-foreground">{ticket.subject}</span>
              <span className="text-xs text-hint">{STATUS_LABEL[ticket.status]}</span>
            </button>
          ))}
        </div>
      </div>

      {isAdmin ? (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-foreground">All Tickets (Admin)</h2>
          {adminTickets && adminTickets.length === 0 ? (
            <p className="text-sm text-hint">No open tickets.</p>
          ) : null}
          <div className="flex flex-col gap-2">
            {adminTickets?.map((ticket) => (
              <button
                key={ticket.id}
                type="button"
                onClick={() => setSelectedId(ticket.id)}
                className="flex items-center justify-between rounded-2xl border border-border bg-surface p-4 text-left text-sm"
              >
                <span className="text-foreground">
                  {ticket.customerName} · {ticket.subject}
                </span>
                <span className="text-xs text-hint">{STATUS_LABEL[ticket.status]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
