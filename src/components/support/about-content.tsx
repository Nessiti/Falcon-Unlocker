"use client";

import { useEffect, useState, type FormEvent } from "react";
import { getAboutAction, updateAboutAction } from "@/lib/actions/about";
import { MarkdownField } from "@/components/ui/markdown-field";
import { Markdown } from "@/components/ui/markdown";

export function AboutContent({
  initData,
  isAdmin,
}: {
  initData: string | null;
  isAdmin: boolean;
}) {
  const [content, setContent] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAboutAction(initData).then((value) => {
      setContent(value);
      setDraft(value);
    });
  }, [initData]);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!initData) return;

    setSubmitting(true);
    setError(null);
    const result = await updateAboutAction(initData, draft);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setContent(draft);
    setEditing(false);
  }

  if (content === null) return <p className="text-sm text-hint">Loading…</p>;

  if (isAdmin && editing) {
    return (
      <form
        onSubmit={handleSave}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <MarkdownField value={draft} onChange={setDraft} rows={10} />
        {error ? <p className="text-xs text-accent">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(content);
            }}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4">
      {content ? <Markdown text={content} /> : <p className="text-sm text-hint">No About content yet.</p>}
      {isAdmin ? (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="self-start rounded-lg border border-border px-3 py-1.5 text-sm text-foreground"
        >
          Edit (Admin)
        </button>
      ) : null}
    </div>
  );
}
