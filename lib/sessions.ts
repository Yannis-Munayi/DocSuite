import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = join(process.cwd(), "storage");

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Session {
  id: string;
  agentId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

function sessionsDir(userId: string) {
  return join(STORAGE_ROOT, userId, "sessions");
}

function sessionsPath(userId: string, agentId: string) {
  return join(sessionsDir(userId), `${agentId}.json`);
}

function ensureDir(userId: string) {
  mkdirSync(sessionsDir(userId), { recursive: true });
}

function readSessions(userId: string, agentId: string): Session[] {
  const p = sessionsPath(userId, agentId);
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as Session[];
  } catch {
    return [];
  }
}

function writeSessions(userId: string, agentId: string, sessions: Session[]) {
  ensureDir(userId);
  writeFileSync(
    sessionsPath(userId, agentId),
    JSON.stringify(sessions, null, 2),
    "utf-8"
  );
}

export function listSessions(userId: string, agentId: string): Session[] {
  return readSessions(userId, agentId).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export interface SaveSessionInput {
  id?: string;
  agentId: string;
  title: string;
  messages: ChatMessage[];
}

export function saveSession(userId: string, session: SaveSessionInput): Session {
  ensureDir(userId);
  const sessions = readSessions(userId, session.agentId);
  const now = new Date().toISOString();

  if (session.id) {
    const idx = sessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      const updated: Session = { ...sessions[idx], ...session, id: session.id, updatedAt: now };
      sessions[idx] = updated;
      writeSessions(userId, session.agentId, sessions);
      return updated;
    }
  }

  const newSession: Session = {
    id: randomUUID(),
    agentId: session.agentId,
    title: session.title,
    messages: session.messages,
    createdAt: now,
    updatedAt: now,
  };
  sessions.unshift(newSession);
  writeSessions(userId, session.agentId, sessions);
  return newSession;
}

export function deleteSession(
  userId: string,
  agentId: string,
  sessionId: string
): boolean {
  const sessions = readSessions(userId, agentId);
  const filtered = sessions.filter((s) => s.id !== sessionId);
  if (filtered.length === sessions.length) return false;
  writeSessions(userId, agentId, filtered);
  return true;
}
