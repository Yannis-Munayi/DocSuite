"use client";

import Link from "next/link";
import type { Agent } from "@/lib/agents";

const ICONS: Record<string, string> = {
  "brd-generator": "📄",
  "srd-generator": "🔧",
  "traceability-matrix": "⊞",
  "user-story-generator": "📋",
};

export default function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/agents/${agent.id}`} className="group block">
      <div className="h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:border-brand-400 hover:shadow-md group-hover:-translate-y-0.5">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-2xl">
          {ICONS[agent.id] ?? "🤖"}
        </div>
        <h2 className="mb-2 text-lg font-semibold text-gray-900 group-hover:text-brand-700">
          {agent.name}
        </h2>
        <p className="text-sm leading-relaxed text-gray-500">{agent.description}</p>
        <div className="mt-4 flex items-center text-sm font-medium text-brand-600">
          Open agent
          <svg
            className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
