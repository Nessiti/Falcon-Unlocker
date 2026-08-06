"use client";

import { useId, useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { formInputClass } from "@/lib/ui";

function tabClass(active: boolean) {
  return `rounded-md px-2 py-0.5 text-xs font-medium ${
    active ? "bg-accent text-accent-foreground" : "text-hint"
  }`;
}

/**
 * A textarea for admin-authored Markdown with a Write/Preview toggle, so
 * admins can format News, Popups, FAQ answers, and About content — bold,
 * italic, links, lists, blockquotes, code — without needing a developer.
 */
export function MarkdownField({
  value,
  onChange,
  placeholder,
  required,
  rows = 4,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  const [tab, setTab] = useState<"write" | "preview">("write");
  const id = useId();

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <button type="button" onClick={() => setTab("write")} className={tabClass(tab === "write")}>
            Write
          </button>
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={tabClass(tab === "preview")}
          >
            Preview
          </button>
        </div>
        <span className="text-[11px] text-hint">Markdown supported</span>
      </div>

      {tab === "write" ? (
        <textarea
          id={id}
          className={formInputClass}
          style={{ minHeight: `${rows * 1.5}rem` }}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        />
      ) : (
        <div
          className={`${formInputClass} overflow-y-auto`}
          style={{ minHeight: `${rows * 1.5}rem` }}
        >
          {value.trim() ? <Markdown text={value} /> : <p className="text-sm text-hint">Nothing to preview yet.</p>}
        </div>
      )}
    </div>
  );
}
