"use client";

import type { NewsPostSummary } from "@/lib/actions/admin-news";
import { Markdown } from "@/components/ui/markdown";

export function NewsModal({ posts, onClose }: { posts: NewsPostSummary[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4">
      <div className="flex max-h-[80vh] w-full max-w-sm flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">News</h2>
          <button type="button" onClick={onClose} className="text-sm text-hint">
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto">
          {posts.length === 0 ? (
            <p className="text-sm text-hint">No news yet.</p>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="flex flex-col gap-1 border-b border-border pb-3 last:border-0 last:pb-0">
                <p className="text-sm font-medium text-foreground">{post.title}</p>
                <Markdown text={post.body} />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
