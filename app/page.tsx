import AgentCard from "@/components/AgentCard";
import { AGENTS } from "@/lib/agents";

export default function HomePage() {
  return (
    <div className="min-h-full bg-gradient-to-br from-gray-50 to-brand-50 px-4 py-16">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-medium text-brand-700">
            <span>✦</span>
            <span>AI-Powered Document Agents</span>
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-900">
            DocSuite
          </h1>
          <p className="mx-auto max-w-xl text-base text-gray-500">
            Upload your requirements documents and let AI do the heavy lifting.
            Choose an agent below to get started.
          </p>
        </div>

        {/* Agent grid */}
        <div className="grid gap-5 sm:grid-cols-2">
          {AGENTS.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>

        {/* Footer */}
        <p className="mt-12 text-center text-xs text-gray-400">
          Powered by Claude · Upload PDF, Word, Excel, or CSV files
        </p>
      </div>
    </div>
  );
}
