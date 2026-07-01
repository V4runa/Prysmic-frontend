"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";
import clsx from "clsx";

/**
 * Renders note content as sanitized GitHub-flavored Markdown.
 * Authoring stays plain text; this only affects the read/view surface.
 */
const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-slate-100 text-2xl font-bold mt-6 mb-3 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-slate-100 text-xl font-semibold mt-5 mb-2 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-slate-100 text-lg font-semibold mt-4 mb-2 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-slate-200 text-base font-semibold mt-4 mb-1 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="my-3 first:mt-0 last:mb-0 leading-relaxed">{children}</p>
  ),
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-cyan-300 underline decoration-cyan-300/40 underline-offset-2 hover:text-cyan-200"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul className="my-3 pl-5 list-disc marker:text-slate-500 space-y-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 pl-5 list-decimal marker:text-slate-500 space-y-1">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-cyan-300/40 pl-4 text-slate-400 italic">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-5 border-white/10" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-100">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || "");
    if (isBlock) {
      return (
        <code className="block font-mono text-xs sm:text-sm text-slate-200 whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.85em] text-cyan-200">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-black/30 border border-white/10 p-3 app-scroll">
      {children}
    </pre>
  ),
  input: ({ checked, type }) =>
    type === "checkbox" ? (
      <input
        type="checkbox"
        checked={!!checked}
        readOnly
        className="mr-2 -mb-0.5 h-4 w-4 rounded border-white/20 bg-white/10 accent-cyan-400"
      />
    ) : null,
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto app-scroll">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-white/10 bg-white/5 px-3 py-1.5 text-left font-semibold text-slate-200">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-white/10 px-3 py-1.5 text-slate-300">
      {children}
    </td>
  ),
};

export default function MarkdownContent({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "selectable-text text-slate-300 text-sm sm:text-base",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeSanitize]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
