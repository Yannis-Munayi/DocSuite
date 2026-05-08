import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { markdownToDocx, markdownToXlsx } from "@/lib/convert";
import { saveOutput } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { content, agentId, title } = await req.json() as {
    content: string;
    agentId: string;
    title: string;
  };

  let buffer: Buffer;
  let format: string;
  let mimeType: string;
  let filename: string;

  if (agentId === "traceability-matrix") {
    buffer = markdownToXlsx(content, title);
    format = "xlsx";
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    filename = `${title}.xlsx`;
  } else {
    buffer = await markdownToDocx(content, title);
    format = "docx";
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    filename = `${title}.docx`;
  }

  saveOutput(userId, filename, buffer, format, agentId);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}
