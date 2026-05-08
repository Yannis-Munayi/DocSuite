import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { saveUpload } from "@/lib/storage";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const userId = session?.user?.id;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name;
    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // PDF — return base64; Gemini accepts it natively as inlineData
    if (ext === "pdf") {
      if (userId) saveUpload(userId, name, buffer);
      const base64 = buffer.toString("base64");
      return NextResponse.json({
        name,
        type: "pdf",
        base64,
        mimeType: "application/pdf",
      });
    }

    // DOCX — extract plain text with mammoth
    if (ext === "docx" || ext === "doc") {
      const mammoth = await import("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      const text = `[Document: ${name}]\n\n${result.value}`;
      if (userId) saveUpload(userId, name, buffer);
      return NextResponse.json({ name, type: "text", text, mimeType: file.type });
    }

    // XLSX / CSV — convert sheets to markdown tables
    if (ext === "xlsx" || ext === "xls" || ext === "csv") {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const sections: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rows: string[][] = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: "",
        }) as string[][];

        if (rows.length === 0) continue;

        const header = rows[0].map(String);
        const separator = header.map(() => "---");
        const body = rows.slice(1).map((r) =>
          header.map((_, i) => String(r[i] ?? ""))
        );

        const tableRows = [header, separator, ...body]
          .map((row) => "| " + row.join(" | ") + " |")
          .join("\n");

        sections.push(`### Sheet: ${sheetName}\n\n${tableRows}`);
      }

      const text = `[Document: ${name}]\n\n${sections.join("\n\n")}`;
      if (userId) saveUpload(userId, name, buffer);
      return NextResponse.json({ name, type: "text", text, mimeType: file.type });
    }

    // Plain text fallback
    const text = `[Document: ${name}]\n\n${new TextDecoder().decode(bytes)}`;
    if (userId) saveUpload(userId, name, buffer);
    return NextResponse.json({ name, type: "text", text, mimeType: file.type });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
