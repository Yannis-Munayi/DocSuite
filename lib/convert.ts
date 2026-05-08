import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
  ShadingType,
  convertInchesToTwip,
} from "docx";
import * as XLSX from "xlsx";

// ── Inline text parser ────────────────────────────────────────────────────────

interface InlineRun {
  text: string;
  bold?: boolean;
  italics?: boolean;
  font?: string;
  size?: number;
}

function parseInline(raw: string): InlineRun[] {
  const text = raw.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/\r/g, "");
  if (!text) return [{ text: "" }];

  const runs: InlineRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      runs.push({ text: part.slice(2, -2), bold: true });
    } else if (part.startsWith("*") && part.endsWith("*")) {
      runs.push({ text: part.slice(1, -1), italics: true });
    } else if (part.startsWith("`") && part.endsWith("`")) {
      runs.push({ text: part.slice(1, -1), font: "Courier New", size: 18 });
    } else {
      runs.push({ text: part });
    }
  }
  return runs.length ? runs : [{ text }];
}

function inlineToRuns(runs: InlineRun[]): TextRun[] {
  return runs.map((r) => new TextRun(r));
}

// ── Table builder ─────────────────────────────────────────────────────────────

function buildDocxTable(tableLines: string[]): Table {
  // Remove separator row (---|---|---) and empty lines
  const dataLines = tableLines.filter(
    (l) => l.trim() && !l.match(/^\|?[\s|:-]+\|$/)
  );

  const rows = dataLines.map((line, rowIndex) => {
    const cells = line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());

    const isHeader = rowIndex === 0;

    return new TableRow({
      tableHeader: isHeader,
      children: cells.map(
        (cell) =>
          new TableCell({
            shading: isHeader
              ? { fill: "4263eb", type: ShadingType.SOLID, color: "ffffff" }
              : undefined,
            margins: {
              top: convertInchesToTwip(0.04),
              bottom: convertInchesToTwip(0.04),
              left: convertInchesToTwip(0.08),
              right: convertInchesToTwip(0.08),
            },
            children: [
              new Paragraph({
                children: parseInline(cell).map(
                  (run) =>
                    new TextRun({
                      ...run,
                      bold: isHeader ? true : run.bold,
                      color: isHeader ? "ffffff" : undefined,
                      size: 18,
                    })
                ),
              }),
            ],
          })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
      left: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
      right: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: "d1d5db" },
    },
    rows,
  });
}

// ── Markdown → DOCX elements ──────────────────────────────────────────────────

type DocElement = Paragraph | Table;

function markdownToElements(markdown: string): DocElement[] {
  const lines = markdown.split("\n");
  const elements: DocElement[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const levels = [
        HeadingLevel.HEADING_1,
        HeadingLevel.HEADING_2,
        HeadingLevel.HEADING_3,
        HeadingLevel.HEADING_4,
        HeadingLevel.HEADING_5,
        HeadingLevel.HEADING_6,
      ];
      elements.push(
        new Paragraph({
          heading: levels[Math.min(level - 1, 5)],
          children: inlineToRuns(parseInline(headingMatch[2])),
          spacing: { before: level === 1 ? 360 : 240, after: 120 },
        })
      );
      i++;
      continue;
    }

    // Table — collect all pipe-starting lines
    if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        elements.push(buildDocxTable(tableLines));
        elements.push(new Paragraph({ text: "", spacing: { after: 120 } }));
      }
      continue;
    }

    // Horizontal rule
    if (line.match(/^(-{3,}|\*{3,}|_{3,})$/)) {
      elements.push(new Paragraph({ text: "", spacing: { after: 200 } }));
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^(\s*[-*+])\s+/)) {
      while (i < lines.length && lines[i].match(/^(\s*[-*+])\s+/)) {
        const text = lines[i].replace(/^\s*[-*+]\s+/, "");
        elements.push(
          new Paragraph({
            bullet: { level: 0 },
            children: inlineToRuns(parseInline(text)),
            spacing: { after: 60 },
          })
        );
        i++;
      }
      continue;
    }

    // Ordered list — render as "N. text" (simpler than docx numbering config)
    if (line.match(/^\s*\d+\.\s+/)) {
      while (i < lines.length && lines[i].match(/^\s*\d+\.\s+/)) {
        const numMatch = lines[i].match(/^(\s*\d+\.)\s+(.+)$/);
        if (numMatch) {
          elements.push(
            new Paragraph({
              children: [
                new TextRun({ text: numMatch[1] + "  ", bold: false }),
                ...inlineToRuns(parseInline(numMatch[2])),
              ],
              spacing: { after: 60 },
              indent: { left: convertInchesToTwip(0.25) },
            })
          );
        }
        i++;
      }
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      elements.push(new Paragraph({ text: "", spacing: { after: 80 } }));
      i++;
      continue;
    }

    // Regular paragraph
    elements.push(
      new Paragraph({
        children: inlineToRuns(parseInline(line)),
        spacing: { after: 120 },
      })
    );
    i++;
  }

  return elements;
}

// ── Public: markdown → DOCX Buffer ───────────────────────────────────────────

export async function markdownToDocx(
  markdown: string,
  title: string
): Promise<Buffer> {
  const bodyElements = markdownToElements(markdown);

  const doc = new Document({
    title,
    creator: "DocSuite",
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 },
        },
        heading1: {
          run: { bold: true, size: 32, color: "1e3a8a" },
        },
        heading2: {
          run: { bold: true, size: 26, color: "1e40af" },
        },
        heading3: {
          run: { bold: true, size: 22, color: "1d4ed8" },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1.25),
              right: convertInchesToTwip(1.25),
            },
          },
        },
        children: [
          // Cover title
          new Paragraph({
            children: [new TextRun({ text: title, bold: true, size: 40, color: "1e3a8a" })],
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 480 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated by DocSuite · ${new Date().toLocaleDateString("en-CA")}`,
                size: 18,
                color: "6b7280",
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 720 },
          }),
          ...bodyElements,
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}

// ── Public: markdown → XLSX Buffer ───────────────────────────────────────────

/** Extracts all markdown tables and writes each to an Excel sheet. */
export function markdownToXlsx(markdown: string, title: string): Buffer {
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: title, Author: "DocSuite" };

  const lines = markdown.split("\n");
  let i = 0;
  let sheetIndex = 0;
  let lastHeading = "Sheet";

  while (i < lines.length) {
    const line = lines[i];

    // Track the most recent heading to name the sheet
    const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
    if (headingMatch) {
      lastHeading = headingMatch[1].replace(/[\\/?*[\]]/g, "").slice(0, 28);
      i++;
      continue;
    }

    // Table block
    if (line.trimStart().startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trimStart().startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }

      // Parse into rows, skipping separator
      const dataLines = tableLines.filter(
        (l) => l.trim() && !l.match(/^\|?[\s|:-]+\|$/)
      );

      const rows = dataLines.map((dl) =>
        dl
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) =>
            c
              .trim()
              .replace(/\*\*([^*]+)\*\*/g, "$1")
              .replace(/\*([^*]+)\*/g, "$1")
          )
      );

      if (rows.length < 1) continue;

      const ws = XLSX.utils.aoa_to_sheet(rows);

      // Style header row (bold)
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
        if (!ws[cellAddr]) continue;
        ws[cellAddr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" } },
          fill: { fgColor: { rgb: "4263EB" }, patternType: "solid" },
          alignment: { wrapText: true },
        };
      }

      // Auto column widths (rough estimate)
      ws["!cols"] = rows[0].map((_, ci) => ({
        wch: Math.min(
          40,
          Math.max(10, ...rows.map((r) => (r[ci] ?? "").length))
        ),
      }));

      const sheetName =
        sheetIndex === 0
          ? "Traceability Matrix"
          : `${lastHeading}`.slice(0, 31) || `Sheet${sheetIndex + 1}`;

      XLSX.utils.book_append_sheet(workbook, ws, sheetName);
      sheetIndex++;
      continue;
    }

    i++;
  }

  // Fallback: if no tables found, write the raw markdown as a single cell
  if (sheetIndex === 0) {
    const ws = XLSX.utils.aoa_to_sheet([[markdown]]);
    XLSX.utils.book_append_sheet(workbook, ws, "Output");
  }

  return Buffer.from(XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }));
}
