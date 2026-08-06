"use client";

import { useEffect, useState } from "react";
import { getActivePopupAction, type PopupSummary } from "@/lib/actions/admin-popups";
import { Markdown } from "@/components/ui/markdown";

export function PopupDisplay() {
  const [popup, setPopup] = useState<PopupSummary | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    getActivePopupAction().then(setPopup);
  }, []);

  if (!popup || dismissed) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div
        className="flex max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-5 text-center"
        style={{ backgroundColor: popup.color ?? undefined }}
      >
        {popup.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin-provided image URL
          <img
            src={popup.imageUrl}
            alt=""
            className="mx-auto max-h-40 rounded-lg object-contain"
          />
        ) : null}
        <h2 className="text-base font-semibold text-foreground">{popup.title}</h2>
        <Markdown text={popup.message} />
        <div className="flex justify-center gap-2">
          {popup.buttonText && popup.buttonUrl ? (
            <a
              href={popup.buttonUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground"
            >
              {popup.buttonText}
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
