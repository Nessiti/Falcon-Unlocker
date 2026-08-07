"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  listHelpArticlesAction,
  createHelpArticleAction,
  type HelpArticleSummary,
} from "@/lib/actions/help";
import { formInputClass } from "@/lib/ui";

export function HelpTab({ initData, isAdmin }: { initData: string; isAdmin: boolean }) {
  const [articles, setArticles] = useState<HelpArticleSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => listHelpArticlesAction(initData).then(setArticles), [initData]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createHelpArticleAction(initData, {
      title,
      body,
      displayOrder: articles?.length ?? 0,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    await refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {articles && articles.length === 0 ? (
        <p className="text-sm text-hint">No help articles yet.</p>
      ) : null}
      {articles?.map((article) => (
        <div key={article.id} className="rounded-2xl border border-border bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">{article.title}</p>
          <p className="mt-1 whitespace-pre-line text-sm text-hint">{article.body}</p>
        </div>
      ))}

      {isAdmin ? (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
        >
          <h2 className="text-sm font-semibold text-foreground">Add Article (Admin)</h2>
          <input
            className={formInputClass}
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className={formInputClass}
            placeholder="Body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
          {error ? <p className="text-xs text-accent">{error}</p> : null}
          <button
            type="submit"
            disabled={submitting}
            className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Article"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
