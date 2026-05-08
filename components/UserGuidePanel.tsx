"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mb-3 text-base font-bold text-gray-900">{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-2 mt-4 text-sm font-bold text-gray-800">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-1 mt-3 text-sm font-semibold text-gray-700">{children}</h3>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-xs leading-relaxed text-gray-600 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-3 list-disc space-y-0.5 text-xs text-gray-600">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-3 list-decimal space-y-0.5 text-xs text-gray-600">{children}</ol>
  ),
  li: ({ children }) => <li>{children}</li>,
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto rounded border border-gray-200">
      <table className="min-w-full text-xs">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-gray-50">{children}</thead>,
  th: ({ children }) => (
    <th className="px-2 py-1.5 text-left font-semibold text-gray-600">{children}</th>
  ),
  td: ({ children }) => (
    <td className="border-t border-gray-100 px-2 py-1.5 text-gray-600">{children}</td>
  ),
  code: ({ children }) => (
    <code className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs text-gray-700">
      {children}
    </code>
  ),
  hr: () => <hr className="my-3 border-gray-200" />,
  strong: ({ children }) => (
    <strong className="font-semibold text-gray-800">{children}</strong>
  ),
};

interface Props {
  guide: string;
  agentName: string;
}

export default function UserGuidePanel({ guide, agentName }: Props) {
  const [open, setOpen] = useState(true);

  return (
    <div
      className={`flex h-full flex-col border-r border-gray-200 bg-gray-50 transition-all duration-300 ${
        open ? "w-72 min-w-[18rem]" : "w-10 min-w-[2.5rem]"
      }`}
    >
      {/* Header toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 border-b border-gray-200 px-3 py-3 text-left hover:bg-gray-100"
        title={open ? "Collapse guide" : "Expand guide"}
      >
        <span
          className={`text-gray-400 transition-transform duration-200 ${
            open ? "rotate-0" : "rotate-180"
          }`}
        >
          ◀
        </span>
        {open && (
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-gray-500">
            User Guide
          </span>
        )}
      </button>

      {/* Content */}
      {open && (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3">
            <span className="inline-block rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-700">
              {agentName}
            </span>
          </div>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {guide}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
}
