# DocSuite

An AI-powered web application for business analysts and requirements engineers. DocSuite hosts a suite of intelligent agents that automate the most time-consuming parts of the requirements lifecycle — generating BRDs, SRDs, traceability matrices, and user stories from uploaded documents.

It was originally inspired by CIBC's internal CAI platform (a ChatGPT-like tool with configurable agents), rebuilt as a personal full-stack web app.

---

## Agents

### BRD Generator
Converts a free-text project description or uploaded supporting documents (meeting notes, emails, wireframes) into a complete, structured Business Requirements Document. Produces MoSCoW-prioritized requirements in `B1.1` format with objectives, stakeholders, scope, NFRs, and a glossary.

### SRD Generator
Takes a BRD and generates a matching Solution Requirements Document. Every business requirement is traced to one or more solution requirements (`S1.1` format, `Traceable from` column) — ready to feed into the Traceability Matrix Generator.

### Traceability Matrix Generator
Accepts a BRD, SRD, and FSD and produces a full Requirements Traceability Matrix with executive summary, gap analysis, and coverage statistics. Organizes output by BRD subsection with exact FSD section citations.

### User Story Generator
Converts a BRD, MRD, or SRD into atomic, testable, prioritized user stories in "As a / I want / So that" or Gherkin format. Outputs include a coverage matrix, traceability map, Q&A log, and optional JIRA export and INVEST analysis.

---

## Workflow

The agents are designed as a pipeline:

```
BRD Generator → SRD Generator → Traceability Matrix Generator
                     ↓
           User Story Generator
```

You can run any agent independently or chain them — the document IDs (`B1.1`, `S1.1`, `O1`) are kept consistent across agents so outputs feed cleanly into each other.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS |
| AI | Anthropic Claude (`claude-sonnet-4-6`) via `@anthropic-ai/sdk` |
| Auth | NextAuth v5 (beta) with bcrypt credential hashing |
| File parsing | mammoth (DOCX), xlsx (Excel/CSV), native (PDF text extraction) |
| File export | docx library (Word download) |
| Markdown rendering | react-markdown + remark-gfm |

---

## Features

- **4 AI agents** covering the full requirements engineering pipeline
- **File upload** — attach PDF, Word (.docx), Excel (.xlsx), or CSV files to any chat
- **Streaming responses** via SSE for real-time output
- **File manager** — upload, browse, and download your documents
- **Word export** — download any agent response as a `.docx` file
- **Authentication** — register/login with hashed credentials (NextAuth v5)
- **User guide sidebar** — collapsible per-agent guide panel in every chat
- **Markdown tables** — all agent outputs render as formatted tables in the chat UI

---

## Getting Started

### Prerequisites
- Node.js 18+
- An Anthropic API key ([platform.anthropic.com](https://platform.anthropic.com))

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/Yannis-Munayi/DocSuite.git
cd DocSuite

# 2. Install dependencies
npm install

# 3. Create your environment file
cp .env.example .env.local
# Then edit .env.local and add your keys:
# ANTHROPIC_API_KEY=sk-ant-...
# AUTH_SECRET=<any random string>

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
DocSuite/
├── app/
│   ├── agents/[id]/page.tsx     # Individual agent chat page
│   ├── api/
│   │   ├── chat/route.ts        # SSE streaming proxy to Claude API
│   │   ├── upload/route.ts      # File → text conversion
│   │   ├── download/route.ts    # Response → .docx export
│   │   └── files/               # File storage CRUD
│   ├── files/page.tsx           # File manager page
│   ├── login/page.tsx           # Auth pages
│   └── page.tsx                 # Home page with agent cards
├── components/
│   ├── ChatWindow.tsx            # Full chat UI with file attach
│   ├── MessageBubble.tsx         # Markdown-rendering chat bubble
│   ├── UserGuidePanel.tsx        # Collapsible left sidebar
│   ├── AgentCard.tsx             # Home page agent card
│   └── Navbar.tsx                # Top navigation
├── lib/
│   ├── agents.ts                 # Agent registry (system prompts + guides)
│   ├── convert.ts                # File → plain text conversion logic
│   ├── storage.ts                # File storage utilities
│   └── users.ts                  # User management
└── types/
    └── next-auth.d.ts            # NextAuth session type extensions
```

---

## Adding a New Agent

Add a new object to the `AGENTS` array in [lib/agents.ts](lib/agents.ts):

```ts
{
  id: "my-agent",
  name: "My Agent",
  description: "Shown on the home page card.",
  systemPrompt: `You are an AI that...`,
  userGuide: `# User Guide\n\n...`,
}
```

The agent automatically gets its own chat page at `/agents/my-agent` with streaming, file upload, and the user guide sidebar — no additional code needed.
