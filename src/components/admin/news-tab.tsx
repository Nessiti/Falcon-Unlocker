"use client";

import { useEffect, useState, type FormEvent } from "react";
import { listNewsAction, createNewsAction, type NewsPostSummary } from "@/lib/actions/admin-news";
import { formInputClass } from "@/lib/ui";
import { MarkdownField } from "@/components/ui/markdown-field";
import { Markdown } from "@/components/ui/markdown";

export function NewsTab({ initData }: { initData: string }) {
  const [posts, setPosts] = useState<NewsPostSummary[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pinned, setPinned] = useState(false);
  const [publishAt, setPublishAt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    listNewsAction(initData).then(setPosts);
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initData]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await createNewsAction(initData, {
      title,
      body,
      pinned,
      publishAt: publishAt || null,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setTitle("");
    setBody("");
    setPinned(false);
    setPublishAt("");
    refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4"
      >
        <h2 className="text-sm font-semibold text-foreground">Add News Post</h2>
        <input
          className={formInputClass}
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <MarkdownField value={body} onChange={setBody} placeholder="Body" required />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-1 text-xs text-hint">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
            />
            Pin
          </label>
          <input
            className={`${formInputClass} w-auto`}
            type="datetime-local"
            value={publishAt}
            onChange={(e) => setPublishAt(e.target.value)}
            title="Schedule (optional)"
          />
        </div>
        {error ? <p className="text-xs text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-accent-foreground disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Publish"}
        </button>
      </form>

      {posts && posts.length === 0 ? <p className="text-sm text-hint">No news yet.</p> : null}
      {posts?.map((post) => (
        <div key={post.id} className="rounded-2xl border border-border bg-surface p-4 text-sm">
          <p className="font-medium text-foreground">
            {post.pinned ? "📌 " : ""}
            {post.title}
          </p>
          <Markdown text={post.body} className="mt-1" />
        </div>
      ))}
    </div>
  );
}
