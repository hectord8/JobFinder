"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface CvInfo {
  fileName: string;
  fileUrl: string | null;
  createdAt: string;
  textPreview: string;
  textLength: number;
}

export function CvManager({ initial }: { initial: CvInfo | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [cv, setCv] = useState<CvInfo | null>(initial);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function onUpload(file: File) {
    setError(null);
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/cv", { method: "POST", body: fd });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Upload failed.");
      return;
    }
    // Re-fetch the stored info for the preview.
    const info = await fetch("/api/cv").then((r) => r.json());
    if (info.cv) {
      setCv({
        fileName: info.cv.fileName,
        fileUrl: info.cv.fileUrl,
        createdAt: info.cv.createdAt,
        textPreview: info.cv.textPreview,
        textLength: info.cv.textLength,
      });
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
        <div
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-brand-400 dark:border-gray-700"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) onUpload(f);
          }}
        >
          <p className="font-medium">
            {uploading ? "Uploading & parsing…" : "Click or drag a PDF here"}
          </p>
          <p className="text-xs text-gray-500">PDF only, max 8 MB</p>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {cv && (
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{cv.fileName}</p>
              <p className="text-xs text-gray-500">
                Uploaded {new Date(cv.createdAt).toLocaleString()} ·{" "}
                {cv.textLength.toLocaleString()} chars extracted
              </p>
            </div>
            <a
              href={cv.fileUrl ?? "/api/cv/file"}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              View PDF
            </a>
          </div>
          <details>
            <summary className="cursor-pointer text-sm text-gray-500">
              Extracted text preview
            </summary>
            <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded bg-gray-50 p-3 text-xs dark:bg-gray-800">
              {cv.textPreview}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
