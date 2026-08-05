"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getActivePopupAction,
  createPopupAction,
  deactivatePopupAction,
  type PopupSummary,
} from "@/lib/actions/admin-popups";
import { formInputClass } from "@/lib/ui";

export function PopupTab({ initData }: { initData: string }) {
  const [active, setActive] = useState<PopupSummary | null | undefined>(undefined);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [color, setColor] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [animation, setAnimation] = useState("");
  const [buttonText, setButtonText] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getActivePopupAction().then(setActive);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createPopupAction(initData, {
      title,
      message,
      color: color || null,
      imageUrl: imageUrl || null,
      animation: animation || null,
      buttonText: buttonText || null,
      buttonUrl: buttonUrl || null,
      expiresAt: expiresAt || null,
      notifyUsers,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setMessage("");
    setColor("");
    setImageUrl("");
    setAnimation("");
    setButtonText("");
    setButtonUrl("");
    setExpiresAt("");
    refresh();
  }

  async function handleDeactivate(id: string) {
    const result = await deactivatePopupAction(initData, id);
    if (result.ok) refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <div className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium text-foreground">Active: {active.title}</p>
          <p className="mt-1 text-hint">{active.message}</p>
          <button
            type="button"
            onClick={() => handleDeactivate(active.id)}
            className="mt-2 rounded-lg border border-border px-2 py-1 text-xs text-accent"
          >
            Deactivate
          </button>
        </div>
      ) : active === null ? (
        <p className="text-sm text-hint">No active popup.</p>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-sm font-semibold text-foreground">Create Popup</h2>
        <input
          className={formInputClass}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          className={formInputClass}
          placeholder="Message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={formInputClass}
            placeholder="Color (e.g. #e6283c)"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
          <input
            className={formInputClass}
            placeholder="Animation (e.g. fade)"
            value={animation}
            onChange={(e) => setAnimation(e.target.value)}
          />
        </div>
        <input
          className={formInputClass}
          placeholder="Image URL"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            className={formInputClass}
            placeholder="Button text"
            value={buttonText}
            onChange={(e) => setButtonText(e.target.value)}
          />
          <input
            className={formInputClass}
            placeholder="Button URL"
            value={buttonUrl}
            onChange={(e) => setButtonUrl(e.target.value)}
          />
        </div>
        <input
          className={formInputClass}
          type="datetime-local"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          title="Expiration date"
        />
        <label className="flex items-center gap-1 text-xs text-hint">
          <input
            type="checkbox"
            checked={notifyUsers}
            onChange={(e) => setNotifyUsers(e.target.checked)}
          />
          Notify all users (Promotion)
        </label>
        {error ? <p className="text-xs text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting ? "Publishing…" : "Publish Popup"}
        </button>
      </form>
    </div>
  );
}
