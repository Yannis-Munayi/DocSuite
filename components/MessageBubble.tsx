"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

interface Props {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

const mdComponents: Components = {
  table: ({ children }) => (
    <div className="my-4 overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
  ),
  th: ({ children }) => (
    <th className="px-4 py-3 text-left font-semibold">{children}</th>
  ),
  td: ({ children }) => (
    <td className="whitespace-pre-wrap px-4 py-3 text-gray-700">{children}</td>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes("language-");
    return isBlock ? (
      <pre className="my-3 overflow-x-auto rounded-lg bg-gray-900 p-4 text-sm text-gray-100">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    ) : (
      <code
        className="rounded bg-gray-100 px-1.5 py-0.5 font-mono text-sm text-gray-800"
        {...props}
      >
        {children}
      </code>
    );
  },
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 ml-4 list-disc space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 ml-4 list-decimal space-y-1">{children}</ol>,
  li: ({ children }) => <li className="text-gray-700">{children}</li>,
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-bold text-gray-900">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-2 mt-4 text-lg font-bold text-gray-900">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-3 text-base font-semibold text-gray-900">{children}</h3>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-4 border-brand-300 pl-4 italic text-gray-600">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-gray-200" />,
};

export default function MessageBubble({ role, content, streaming }: Props) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm text-white shadow-sm">
          <p className="whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="flex max-w-[85%] gap-3">
        <div className="mt-1 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
          AI
        </div>
        <div className="rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-gray-800 shadow-sm ring-1 ring-gray-100">
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {content}
          </ReactMarkdown>
          {streaming && (
            <span className="inline-block h-4 w-0.5 animate-pulse bg-gray-400" />
          )}
        </div>
      </div>
    </div>
  );
}
