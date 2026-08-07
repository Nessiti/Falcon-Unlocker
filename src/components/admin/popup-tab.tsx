"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  getActivePopupAction,
  createPopupAction,
  deactivatePopupAction,
  type PopupSummary,
} from "@/lib/actions/admin-popups";
import { formInputClass } from "@/lib/ui";
import { MarkdownField } from "@/components/ui/markdown-field";
import { Markdown } from "@/components/ui/markdown";

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
  const [requiredChannel, setRequiredChannel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    getActivePopupAction(initData).then(setActive);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      requiredChannel: requiredChannel || null,
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
    setRequiredChannel("");
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
          <Markdown text={active.message} className="mt-1" />
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
        <MarkdownField value={message} onChange={setMessage} placeholder="Message" required />
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
        <div className="flex flex-col gap-1">
          <input
            className={formInputClass}
            placeholder="Required channel (e.g. @FalconUnlockerBotChannel) - optional"
            value={requiredChannel}
            onChange={(e) => setRequiredChannel(e.target.value)}
          />
          <p className="text-[11px] text-hint">
            When set, this popup is skipped for users who already belong to that channel. The bot
            must be a member of it to check.
          </p>
        </div>
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
