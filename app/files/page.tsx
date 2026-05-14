"use client";

import { useState, useEffect, useCallback } from "react";

interface FileRecord {
  id: string;
  name: string;
  kind: "upload" | "output";
  format: string;
  sizeBytes: number;
  createdAt: string;
  agentId?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const FORMAT_ICON: Record<string, string> = {
  docx: "📝",
  xlsx: "📊",
  pdf: "📄",
  csv: "📋",
  txt: "📃",
  doc: "📝",
};

const FORMAT_COLORS: Record<string, string> = {
  docx: "bg-blue-50 text-blue-700",
  xlsx: "bg-green-50 text-green-700",
  pdf: "bg-red-50 text-red-700",
  csv: "bg-yellow-50 text-yellow-700",
  txt: "bg-gray-100 text-gray-600",
};

function FileRow({
  file,
  onDelete,
}: {
  file: FileRecord;
  onDelete: (id: string) => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Delete "${file.name}"?`)) return;
    setDeleting(true);
    try {
      await fetch(`/api/files/${file.id}`, { method: "DELETE" });
      onDelete(file.id);
    } finally {
      setDeleting(false);
    }
  };

  const icon = FORMAT_ICON[file.format] ?? "📁";
  const badgeClass = FORMAT_COLORS[file.format] ?? "bg-gray-100 text-gray-600";

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 hover:border-gray-200 transition-colors">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-gray-800">{file.name}</p>
        <p className="text-xs text-gray-400">{formatDate(file.createdAt)} · {formatBytes(file.sizeBytes)}</p>
      </div>
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium uppercase ${badgeClass}`}>
        {file.format}
      </span>
      <a
        href={`/api/files/${file.id}`}
        download={file.name}
        className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
      >
        Download
      </a>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="rounded-lg border border-red-100 px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        {deleting ? "…" : "Delete"}
      </button>
    </div>
  );
}

export default function FilesPage() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/files");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      if (res.ok) {
        const data = await res.json() as FileRecord[];
        setFiles(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const handleDelete = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const uploads = files.filter((f) => f.kind === "upload");
  const outputs = files.filter((f) => f.kind === "output");

  return (
    <div className="h-full overflow-y-auto bg-gray-50 px-6 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">My Files</h1>
          <p className="mt-1 text-sm text-gray-500">Your uploaded documents and generated agent outputs.</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading…</div>
        ) : files.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <div className="mb-3 text-4xl">🗂️</div>
            <p className="text-sm text-gray-400">No files yet. Upload a document or generate an agent output to see it here.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {outputs.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Generated Outputs</h2>
                <div className="space-y-2">
                  {outputs.map((f) => (
                    <FileRow key={f.id} file={f} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}

            {uploads.length > 0 && (
              <section>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">Uploaded Documents</h2>
                <div className="space-y-2">
                  {uploads.map((f) => (
                    <FileRow key={f.id} file={f} onDelete={handleDelete} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
