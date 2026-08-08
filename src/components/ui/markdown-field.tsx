"use client";

import { useId, useRef, useState } from "react";
import { Markdown } from "@/components/ui/markdown";
import { formInputClass } from "@/lib/ui";

function tabClass(active: boolean) {
  return `rounded-md px-2 py-0.5 text-xs font-medium ${
    active ? "bg-accent text-accent-foreground" : "text-hint"
  }`;
}

const toolButtonClass =
  "flex h-7 min-w-7 items-center justify-center rounded px-1.5 text-xs font-medium text-foreground transition-colors hover:bg-surface active:scale-95";

/**
 * A textarea for admin-authored Markdown with a Write/Preview toggle, so
 * admins can format News, Popups, FAQ answers, About content, payment
 * instructions, and service descriptions - bold, italic, links, lists,
 * blockquotes, code - without needing a developer or knowing Markdown
 * syntax by heart. A toolbar above the textarea inserts the right
 * characters around the current selection (or at the cursor, with a
 * placeholder, when nothing's selected).
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function wrapSelection(prefix: string, suffix: string, placeholderText: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholderText;
    const next = value.slice(0, start) + prefix + selected + suffix + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    });
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  function insertLink() {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const label = value.slice(start, end) || "link text";
    const insertion = `[${label}](url)`;
    const next = value.slice(0, start) + insertion + value.slice(end);
    onChange(next);

    requestAnimationFrame(() => {
      textarea.focus();
      const urlStart = start + label.length + 3;
      textarea.setSelectionRange(urlStart, urlStart + 3);
    });
  }

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
        <>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => wrapSelection("**", "**", "bold text")}
              className={toolButtonClass}
              aria-label="Bold"
              title="Bold"
            >
              <span className="font-bold">B</span>
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("*", "*", "italic text")}
              className={toolButtonClass}
              aria-label="Italic"
              title="Italic"
            >
              <span className="italic">I</span>
            </button>
            <button
              type="button"
              onClick={() => wrapSelection("`", "`", "code")}
              className={toolButtonClass}
              aria-label="Inline code"
              title="Inline code"
            >
              <span className="font-mono">{"</>"}</span>
            </button>
            <button
              type="button"
              onClick={insertLink}
              className={toolButtonClass}
              aria-label="Link"
              title="Link"
            >
              🔗
            </button>
            <button
              type="button"
              onClick={() => prefixLines("- ")}
              className={toolButtonClass}
              aria-label="Bulleted list"
              title="Bulleted list"
            >
              •
            </button>
            <button
              type="button"
              onClick={() => prefixLines("1. ")}
              className={toolButtonClass}
              aria-label="Numbered list"
              title="Numbered list"
            >
              1.
            </button>
            <button
              type="button"
              onClick={() => prefixLines("> ")}
              className={toolButtonClass}
              aria-label="Quote"
              title="Quote"
            >
              &ldquo;
            </button>
          </div>
          <textarea
            id={id}
            ref={textareaRef}
            className={formInputClass}
            style={{ minHeight: `${rows * 1.5}rem` }}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
          />
        </>
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
