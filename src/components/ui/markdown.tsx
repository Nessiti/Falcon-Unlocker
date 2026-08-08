import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Renders admin-authored free text (News, Popup, FAQ, About, order notes) as
 * Markdown - bold, italic, links, lists, blockquotes, code blocks/inline
 * code, tables. Raw HTML in the source is never rendered (react-markdown
 * treats it as plain text by default), so this is safe for admin-entered
 * content without a separate sanitization step.
 */
export function Markdown({ text, className }: { text: string; className?: string }) {
  return (
    <div className={`prose-markdown text-sm leading-relaxed text-foreground ${className ?? ""}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-accent underline">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
