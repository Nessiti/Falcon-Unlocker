"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { listFaqAction, createFaqAction, type FaqItemSummary } from "@/lib/actions/faq";
import { formInputClass } from "@/lib/ui";
import { MarkdownField } from "@/components/ui/markdown-field";
import { Markdown } from "@/components/ui/markdown";

export function FaqTab({ initData, isAdmin }: { initData: string; isAdmin: boolean }) {
  const [items, setItems] = useState<FaqItemSummary[] | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => listFaqAction().then(setItems), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createFaqAction(initData, {
      question,
      answer,
      displayOrder: items?.length ?? 0,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setQuestion("");
    setAnswer("");
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {items && items.length === 0 ? <p className="text-sm text-hint">No FAQ yet.</p> : null}
      {items?.map((item) => (
        <div key={item.id} className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">{item.question}</p>
          <Markdown text={item.answer} className="mt-1" />
        </div>
      ))}

      {isAdmin ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
        >
          <h2 className="text-sm font-semibold text-foreground">Add FAQ (Admin)</h2>
          <input
            className={formInputClass}
            placeholder="Question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            required
          />
          <MarkdownField value={answer} onChange={setAnswer} placeholder="Answer" required />
          {error ? <p className="text-xs text-accent">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add FAQ"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
