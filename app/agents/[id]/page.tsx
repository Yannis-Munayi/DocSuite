import { notFound } from "next/navigation";
import Link from "next/link";
import { getAgent } from "@/lib/agents";
import UserGuidePanel from "@/components/UserGuidePanel";
import ChatWindow from "@/components/ChatWindow";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const agent = getAgent(id);
  return { title: agent ? `${agent.name} — DocSuite` : "Agent not found" };
}

export default async function AgentPage({ params }: Props) {
  const { id } = await params;
  const agent = getAgent(id);

  if (!agent) {
    notFound();
  }

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb bar */}
      <header className="flex flex-shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Agents
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-sm font-semibold text-gray-800">{agent.name}</h1>
      </header>

      {/* Body: sidebar + chat */}
      <div className="flex flex-1 overflow-hidden">
        <UserGuidePanel guide={agent.userGuide} agentName={agent.name} />
        <main className="flex flex-1 flex-col overflow-hidden">
          <ChatWindow agentId={agent.id} agentName={agent.name} />
        </main>
      </div>
    </div>
  );
}
