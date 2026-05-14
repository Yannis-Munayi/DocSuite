import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { listSessions, saveSession, type SaveSessionInput } from "@/lib/sessions";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const sessions = listSessions(session.user.id, agentId);
  return NextResponse.json(sessions);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json() as SaveSessionInput;

  if (!body.agentId || !body.title || !Array.isArray(body.messages)) {
    return NextResponse.json({ error: "agentId, title, and messages are required" }, { status: 400 });
  }

  const saved = saveSession(session.user.id, body);
  return NextResponse.json(saved);
}
