import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  unlinkSync,
} from "fs";
import { join, extname } from "path";
import { randomUUID } from "crypto";

const STORAGE_ROOT = join(process.cwd(), "storage");

export type FileKind = "upload" | "output";

export interface FileRecord {
  id: string;
  name: string;       // display name (original filename or generated name)
  storedName: string; // actual filename on disk
  kind: FileKind;
  format: string;     // pdf, docx, xlsx, csv, txt, etc.
  sizeBytes: number;
  createdAt: string;
  agentId?: string;   // for outputs, which agent generated it
}

// ── Path helpers ──────────────────────────────────────────────────────────────

function userDir(userId: string) {
  return join(STORAGE_ROOT, userId);
}

function kindDir(userId: string, kind: FileKind) {
  return join(userDir(userId), kind === "upload" ? "uploads" : "outputs");
}

function metaPath(userId: string) {
  return join(userDir(userId), "files.json");
}

function ensureDirs(userId: string) {
  mkdirSync(kindDir(userId, "upload"), { recursive: true });
  mkdirSync(kindDir(userId, "output"), { recursive: true });
}

// ── Metadata CRUD ─────────────────────────────────────────────────────────────

function readMeta(userId: string): FileRecord[] {
  const p = metaPath(userId);
  if (!existsSync(p)) return [];
  try {
    return JSON.parse(readFileSync(p, "utf-8")) as FileRecord[];
  } catch {
    return [];
  }
}

function writeMeta(userId: string, records: FileRecord[]) {
  writeFileSync(metaPath(userId), JSON.stringify(records, null, 2), "utf-8");
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Save an uploaded file's raw bytes to disk and register metadata. */
export function saveUpload(
  userId: string,
  originalName: string,
  buffer: Buffer
): FileRecord {
  ensureDirs(userId);
  const ext = extname(originalName).toLowerCase().replace(".", "") || "bin";
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  const filePath = join(kindDir(userId, "upload"), storedName);
  writeFileSync(filePath, buffer);

  const record: FileRecord = {
    id: randomUUID(),
    name: originalName,
    storedName,
    kind: "upload",
    format: ext,
    sizeBytes: buffer.byteLength,
    createdAt: new Date().toISOString(),
  };

  const records = readMeta(userId);
  records.unshift(record);
  writeMeta(userId, records);
  return record;
}

/** Save a generated output file (DOCX/XLSX) and register metadata. */
export function saveOutput(
  userId: string,
  displayName: string,
  buffer: Buffer,
  format: string,
  agentId: string
): FileRecord {
  ensureDirs(userId);
  const storedName = `${Date.now()}-${randomUUID().slice(0, 8)}.${format}`;
  const filePath = join(kindDir(userId, "output"), storedName);
  writeFileSync(filePath, buffer);

  const record: FileRecord = {
    id: randomUUID(),
    name: displayName,
    storedName,
    kind: "output",
    format,
    sizeBytes: buffer.byteLength,
    createdAt: new Date().toISOString(),
    agentId,
  };

  const records = readMeta(userId);
  records.unshift(record);
  writeMeta(userId, records);
  return record;
}

/** List all file records for a user. */
export function listFiles(userId: string): FileRecord[] {
  return readMeta(userId);
}

/** Get the full path + record for a specific file (security: checks ownership). */
export function getFile(
  userId: string,
  fileId: string
): { record: FileRecord; filePath: string } | null {
  const records = readMeta(userId);
  const record = records.find((r) => r.id === fileId);
  if (!record) return null;
  const dir = kindDir(userId, record.kind);
  const filePath = join(dir, record.storedName);
  if (!existsSync(filePath)) return null;
  return { record, filePath };
}

/** Delete a file record and its file from disk. */
export function deleteFile(userId: string, fileId: string): boolean {
  const result = getFile(userId, fileId);
  if (!result) return false;
  try {
    unlinkSync(result.filePath);
  } catch {
    // file may already be gone
  }
  const records = readMeta(userId).filter((r) => r.id !== fileId);
  writeMeta(userId, records);
  return true;
}
