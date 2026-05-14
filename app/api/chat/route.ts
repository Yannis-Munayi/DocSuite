import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content, type Part } from "@google/generative-ai";
import { getAgent } from "@/lib/agents";

export const runtime = "nodejs";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

interface TextAttachment {
  name: string;
  type: "text";
  text: string;
  mimeType: string;
}

interface PdfAttachment {
  name: string;
  type: "pdf";
  base64: string;
  mimeType: string;
}

type AttachmentPayload = TextAttachment | PdfAttachment;

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

export async function POST(req: NextRequest) {
  const { auth } = await import("@/auth");
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { agentId, messages, attachments } = body as {
      agentId: string;
      messages: IncomingMessage[];
      attachments?: AttachmentPayload[];
    };

    const agent = getAgent(agentId);
    if (!agent) {
      return NextResponse.json({ error: "Unknown agent" }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: agent.systemPrompt,
    });

    // All messages except the last become chat history.
    // Gemini uses "model" instead of "assistant".
    const history: Content[] = messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = model.startChat({ history });

    // Build parts for the current (last) user message
    const lastMessage = messages[messages.length - 1];
    const parts: Part[] = [];

    if (attachments && attachments.length > 0) {
      for (const att of attachments) {
        if (att.type === "pdf") {
          parts.push({
            inlineData: { data: att.base64, mimeType: "application/pdf" },
          });
        } else {
          parts.push({ text: att.text });
        }
      }
    }

    parts.push({ text: lastMessage.content });

    // Stream the response
    const result = await chat.sendMessageStream(parts);

    const readableStream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new NextResponse(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
