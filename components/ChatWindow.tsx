"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import MessageBubble from "./MessageBubble";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface AttachmentPayload {
  name: string;
  type: "text" | "pdf";
  text?: string;
  base64?: string;
  mimeType: string;
}

interface Session {
  id: string;
  title: string;
  updatedAt: string;
  messages: Message[];
}

interface Props {
  agentId: string;
  agentName: string;
}

const ACCEPTED_TYPES = ".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt";

function formatRelativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function deriveTitle(messages: Message[]): string {
  const first = messages.find((m) => m.role === "user")?.content ?? "";
  const cleaned = first.replace(/\[Attached:[^\]]+\]\s*/g, "").trim();
  return cleaned.slice(0, 60) || "Untitled conversation";
}

export default function ChatWindow({ agentId, agentName }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<AttachmentPayload[]>([]);
  const [uploading, setUploading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [downloading, setDownloading] = useState<Set<number>>(new Set());

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  // Close history panel on outside click
  useEffect(() => {
    if (!showHistory) return;
    const handler = (e: MouseEvent) => {
      if (historyPanelRef.current && !historyPanelRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showHistory]);

  // Load session list on mount
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/sessions?agentId=${agentId}`);
      if (res.ok) setSessions(await res.json());
    } catch {
      // silent — history is a convenience feature
    }
  }, [agentId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Auto-save after each completed AI response
  const persistSession = useCallback(
    async (finalMessages: Message[], currentSessionId: string | null) => {
      if (!finalMessages.some((m) => m.role === "assistant" && m.content)) return;
      try {
        const body: Record<string, unknown> = {
          agentId,
          title: deriveTitle(finalMessages),
          messages: finalMessages,
        };
        if (currentSessionId) body.id = currentSessionId;

        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const saved: Session = await res.json();
          setSessionId(saved.id);
          setSessions((prev) => {
            const filtered = prev.filter((s) => s.id !== saved.id);
            return [saved, ...filtered];
          });
        }
      } catch {
        // silent
      }
    },
    [agentId]
  );

  const loadSession = useCallback((s: Session) => {
    setMessages(s.messages);
    setSessionId(s.id);
    setInput("");
    setPendingAttachments([]);
    setShowHistory(false);
  }, []);

  const deleteSessionById = useCallback(
    async (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await fetch(`/api/sessions/${id}?agentId=${agentId}`, { method: "DELETE" });
        setSessions((prev) => prev.filter((s) => s.id !== id));
        if (sessionId === id) {
          setMessages([]);
          setSessionId(null);
        }
      } catch {
        // silent
      }
    },
    [agentId, sessionId]
  );

  const startNewChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setInput("");
    setPendingAttachments([]);
    setShowHistory(false);
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (!files.length) return;

      setUploading(true);
      try {
        const results = await Promise.all(
          files.map(async (file) => {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch("/api/upload", { method: "POST", body: fd });
            if (!res.ok) throw new Error(`Failed to upload ${file.name}`);
            return res.json() as Promise<AttachmentPayload>;
          })
        );
        setPendingAttachments((prev) => [...prev, ...results]);
      } catch (err) {
        console.error(err);
        alert("One or more files failed to upload. Please try again.");
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    []
  );

  const removeAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text && pendingAttachments.length === 0) return;
    if (streaming) return;

    const userContent =
      pendingAttachments.length > 0
        ? `${pendingAttachments.map((a) => `[Attached: ${a.name}]`).join(" ")}${text ? "\n\n" + text : ""}`
        : text;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: userContent },
    ];
    setMessages(newMessages);
    setInput("");
    const attachmentsToSend = pendingAttachments;
    setPendingAttachments([]);
    setStreaming(true);

    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let accContent = "";
    const snapshotSessionId = sessionId;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId,
          messages: newMessages,
          attachments: attachmentsToSend,
        }),
      });

      if (!res.ok) throw new Error("API request failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data) as { text: string };
            accContent += parsed.text;
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last?.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + parsed.text,
                };
              }
              return updated;
            });
          } catch {
            // ignore malformed SSE chunks
          }
        }
      }

      // Persist the completed conversation
      const finalMessages: Message[] = [
        ...newMessages,
        { role: "assistant", content: accContent },
      ];
      await persistSession(finalMessages, snapshotSessionId);
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === "assistant" && last.content === "") {
          updated[updated.length - 1] = {
            ...last,
            content: "Sorry, something went wrong. Please try again.",
          };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }, [agentId, input, messages, pendingAttachments, streaming, sessionId, persistSession]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    },
    [sendMessage]
  );

  const handleDownload = useCallback(
    async (content: string, index: number) => {
      setDownloading((prev) => new Set(prev).add(index));
      try {
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content,
            agentId,
            title: `${agentName} Output`,
          }),
        });
        if (!res.ok) throw new Error("Download failed");
        const blob = await res.blob();
        const ext = agentId === "traceability-matrix" ? "xlsx" : "docx";
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${agentName} Output.${ext}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error(err);
        alert("Download failed. Please try again.");
      } finally {
        setDownloading((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
      }
    },
    [agentId, agentName]
  );

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [input]);

  const isEmpty = messages.length === 0;

  return (
    <div className="relative flex h-full flex-col bg-gray-50">
      {/* Session toolbar */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-2">
        <button
          onClick={startNewChat}
          title="Start a new chat"
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>

        <button
          onClick={() => setShowHistory((v) => !v)}
          title="View chat history"
          className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors ${
            showHistory
              ? "bg-brand-50 text-brand-700"
              : "text-gray-500 hover:bg-gray-100 hover:text-gray-700"
          }`}
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          History
          {sessions.length > 0 && (
            <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">
              {sessions.length}
            </span>
          )}
        </button>
      </div>

      {/* History panel (slide-in overlay) */}
      {showHistory && (
        <div
          ref={historyPanelRef}
          className="absolute right-0 top-[41px] z-20 flex h-[calc(100%-41px)] w-72 flex-col border-l border-gray-200 bg-white shadow-xl"
        >
          <div className="flex flex-shrink-0 items-center justify-between border-b border-gray-100 px-4 py-3">
            <span className="text-sm font-semibold text-gray-800">Chat History</span>
            <button
              onClick={() => setShowHistory(false)}
              className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sessions.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-gray-400">
                No saved sessions yet. Complete a chat to save it automatically.
              </p>
            ) : (
              sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSession(s)}
                  className={`group flex cursor-pointer items-start gap-2 border-b border-gray-50 px-4 py-3 hover:bg-gray-50 ${
                    sessionId === s.id ? "bg-brand-50" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-800">{s.title}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400">
                      {formatRelativeDate(s.updatedAt)} · {s.messages.length} messages
                    </p>
                  </div>
                  <button
                    onClick={(e) => deleteSessionById(s.id, e)}
                    title="Delete session"
                    className="mt-0.5 flex-shrink-0 rounded p-1 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 transition-opacity"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))
            )}
          </div>

          <div className="flex-shrink-0 border-t border-gray-100 p-3">
            <button
              onClick={startNewChat}
              className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-gray-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              + New Chat
            </button>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="mb-3 text-4xl">💬</div>
              <p className="text-sm text-gray-400">
                Upload your documents and send a message to get started.
              </p>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-4">
            {messages.map((msg, i) => {
              const isStreamingThis =
                streaming && i === messages.length - 1 && msg.role === "assistant";
              const showDownload =
                msg.role === "assistant" && msg.content && !isStreamingThis;

              return (
                <div key={i}>
                  <MessageBubble
                    role={msg.role}
                    content={msg.content}
                    streaming={isStreamingThis}
                  />
                  {showDownload && (
                    <div className="mt-1 flex justify-end pr-1">
                      <button
                        onClick={() => handleDownload(msg.content, i)}
                        disabled={downloading.has(i)}
                        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-500 hover:border-brand-300 hover:text-brand-600 transition-colors disabled:opacity-40"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        {downloading.has(i) ? "Saving…" : "Download"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-3">
        <div className="mx-auto max-w-3xl">
          {/* Pending attachments */}
          {pendingAttachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {pendingAttachments.map((att, i) => (
                <div
                  key={i}
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700"
                >
                  <span>📎</span>
                  <span className="max-w-[160px] truncate">{att.name}</span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="ml-0.5 rounded-full p-0.5 hover:bg-brand-100"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex items-end gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 focus-within:border-brand-400 focus-within:ring-2 focus-within:ring-brand-100">
            {/* File attach */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Attach document"
              className="mb-0.5 flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600 disabled:opacity-50"
            >
              {uploading ? (
                <span className="h-5 w-5 animate-spin">⟳</span>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.8}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              )}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              className="hidden"
              onChange={handleFileChange}
            />

            {/* Text input */}
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message… (Shift+Enter for new line)"
              rows={1}
              className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
            />

            {/* Send button */}
            <button
              onClick={sendMessage}
              disabled={
                streaming ||
                uploading ||
                (!input.trim() && pendingAttachments.length === 0)
              }
              className="mb-0.5 flex-shrink-0 rounded-xl bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700 disabled:opacity-40"
              title="Send (Enter)"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-center text-[11px] text-gray-400">
            Supported: PDF, Word (.docx), Excel (.xlsx), CSV
          </p>
        </div>
      </div>
    </div>
  );
}
