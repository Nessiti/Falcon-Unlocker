"use client";

import { useState } from "react";
import type { OrderSummary } from "@/lib/actions/orders";
import { Markdown } from "@/components/ui/markdown";
import { formatUsd } from "@/lib/ui";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CHECKING: "Checking",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

function buildShareText(order: OrderSummary): string {
  const lines = [
    `Order #${order.id.slice(0, 8)}`,
    `Service: ${order.serviceName} (${order.kind})`,
    `Status: ${STATUS_LABEL[order.status] ?? order.status}`,
    `Price: ${formatUsd(order.priceCents)}`,
    `Date: ${new Date(order.createdAt).toLocaleString()}`,
  ];
  if (order.tracking) lines.push(`Tracking: ${order.tracking}`);
  if (order.fields.length > 0) {
    lines.push("");
    for (const field of order.fields) lines.push(`${field.label}: ${field.value}`);
  }
  if (order.notes) {
    lines.push("");
    lines.push(`Notes: ${order.notes}`);
  }
  if (order.statusHistory.length > 0) {
    lines.push("");
    lines.push("History:");
    for (const event of order.statusHistory) {
      const when = new Date(event.createdAt).toLocaleString();
      lines.push(`- ${STATUS_LABEL[event.status] ?? event.status} · ${when}${event.comment ? ` — ${event.comment}` : ""}`);
    }
  }
  return lines.join("\n");
}

export function OrderDetailModal({ order, onClose }: { order: OrderSummary; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleCopy() {
    await navigator.clipboard.writeText(buildShareText(order));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleShare() {
    try {
      await navigator.share({
        title: `Order #${order.id.slice(0, 8)} — ${order.serviceName}`,
        text: buildShareText(order),
      });
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-foreground">{order.serviceName}</p>
            <p className="text-xs text-hint">
              {order.kind} · #{order.id.slice(0, 8)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-border px-2 py-1 text-xs text-foreground"
          >
            Close
          </button>
        </div>

        <dl className="flex flex-col gap-1 rounded-lg bg-background p-3 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-hint">Status</dt>
            <dd className="font-medium text-foreground">{STATUS_LABEL[order.status] ?? order.status}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-hint">Price</dt>
            <dd className="font-medium text-foreground">{formatUsd(order.priceCents)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-hint">Date</dt>
            <dd className="text-foreground">{new Date(order.createdAt).toLocaleString()}</dd>
          </div>
          {order.tracking ? (
            <div className="flex justify-between gap-2">
              <dt className="text-hint">Tracking</dt>
              <dd className="break-all text-foreground">{order.tracking}</dd>
            </div>
          ) : null}
        </dl>

        {order.fields.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-hint">Submitted information</p>
            <dl className="flex flex-col gap-1 rounded-lg bg-background p-3 text-sm">
              {order.fields.map((field) => (
                <div key={field.label} className="flex justify-between gap-2">
                  <dt className="shrink-0 text-hint">{field.label}</dt>
                  <dd className="break-all text-right text-foreground">{field.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}

        {order.notes ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-hint">Notes</p>
            <div className="rounded-lg bg-background p-3">
              <Markdown text={order.notes} />
            </div>
          </div>
        ) : null}

        {order.downloadUrl ? (
          <a
            href={order.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-medium text-accent"
          >
            Download result
          </a>
        ) : null}

        {order.statusHistory.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-hint">History</p>
            <div className="flex flex-col gap-2 rounded-lg bg-background p-3">
              {order.statusHistory.map((event, index) => (
                <div key={index} className="text-xs">
                  <p className="text-foreground">
                    {STATUS_LABEL[event.status] ?? event.status} ·{" "}
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                  {event.comment ? <Markdown text={event.comment} className="mt-0.5" /> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={handleCopy}
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          {canShare ? (
            <button
              type="button"
              onClick={handleShare}
              className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            >
              Share
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
