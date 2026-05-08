import { NextRequest, NextResponse } from "next/server";
// NextResponse used for JSON error responses; native Response used for file streaming
import { readFileSync } from "fs";
import { auth } from "@/auth";
import { getFile, deleteFile } from "@/lib/storage";

export const runtime = "nodejs";

const MIME_MAP: Record<string, string> = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pdf: "application/pdf",
  csv: "text/csv",
  txt: "text/plain",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const result = getFile(session.user.id, fileId);
  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { record, filePath } = result;
  const buffer = readFileSync(filePath);
  const mimeType = MIME_MAP[record.format] ?? "application/octet-stream";

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `attachment; filename="${record.name}"`,
      "Content-Length": String(buffer.byteLength),
    },
  });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileId } = await params;
  const deleted = deleteFile(session.user.id, fileId);
  if (!deleted) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
