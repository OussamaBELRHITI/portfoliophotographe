"use client";

import { useRef, useState } from "react";
import { adminApi, ApiError, uploadToCloudinary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/lib/types";
import { UploadIcon } from "./icons";
import { Alert, Button, Card, Select } from "./ui";

interface QueueItem {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "saving" | "done" | "error";
  error?: string;
}

/**
 * Implements the four browser-side steps of the upload flow:
 *
 *   1. ask Spring for a signature   (server holds the Cloudinary secret)
 *   2. POST the file to Cloudinary  (bytes never touch our backend)
 *   3. take the URL + public ID back
 *   4. POST that metadata to Spring
 *
 * Files upload one at a time rather than in parallel — a photographer dropping 40 raw exports
 * would otherwise open 40 concurrent connections and stall the whole batch.
 */
export function MediaUploader({
  categories,
  defaultCategoryId,
  onUploaded,
}: {
  categories: Category[];
  defaultCategoryId?: number | null;
  onUploaded: () => void;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [categoryId, setCategoryId] = useState<number | "">(defaultCategoryId ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setQueue((q) => [
      ...q,
      ...Array.from(files).map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  }

  function patch(index: number, changes: Partial<QueueItem>) {
    setQueue((q) => q.map((item, i) => (i === index ? { ...item, ...changes } : item)));
  }

  async function startUpload() {
    if (!token || queue.length === 0) return;
    setBusy(true);
    setError(null);

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === "done") continue;

      // 1. signature from our backend. A failure here is not about this file — Cloudinary is
      // unconfigured or the server is down — so it stops the batch with one clear message
      // instead of marking every file in the queue as failed for the same reason.
      let sig;
      try {
        sig = await adminApi.uploadSignature(token);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not reach the server to start the upload. Please try again.",
        );
        break;
      }

      try {
        patch(i, { status: "uploading", progress: 0 });

        // 2. straight to Cloudinary
        const result = await uploadToCloudinary(item.file, sig, (p) =>
          patch(i, { progress: p }),
        );

        // 3 + 4. hand the metadata back to Spring
        patch(i, { status: "saving", progress: 100 });
        await adminApi.createMedia(token, {
          title: item.file.name.replace(/\.[^.]+$/, ""),
          url: result.secure_url,
          publicId: result.public_id,
          // Cloudinary reports what it actually stored, which beats trusting the extension.
          type: result.resource_type === "video" ? "VIDEO" : "IMAGE",
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
          durationSeconds: result.duration,
          categoryId: categoryId === "" ? null : Number(categoryId),
          visible: true,
        });

        patch(i, { status: "done" });
      } catch (err) {
        const message =
          err instanceof ApiError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Upload failed";
        patch(i, { status: "error", error: message });
      }
    }

    setBusy(false);
    onUploaded();
  }

  const allDone = queue.length > 0 && queue.every((q) => q.status === "done");
  const pendingCount = queue.filter((q) => q.status !== "done").length;

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">Upload</h2>
          <p className="mt-0.5 text-sm text-fg-subtle">
            Files go straight to Cloudinary — large videos are fine.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            label="Add to gallery"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
          >
            <option value="">No gallery (unfiled)</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.visible ? "" : " (hidden)"}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {error && (
        <div className="mb-4">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-line hover:border-line-bright hover:bg-ink/40"
        }`}
      >
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-accent/12 text-accent">
          <UploadIcon size={20} />
        </span>
        <p className="text-sm font-medium text-fg">Drop photos or videos here</p>
        <p className="mt-1 text-sm text-fg-subtle">
          or <span className="text-accent underline-offset-2 hover:underline">browse your files</span>
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => {
            addFiles(e.target.files);
            // Reset so re-selecting the same file still fires onChange.
            e.target.value = "";
          }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="mt-5 space-y-2">
          {queue.map((item, i) => (
            <li key={`${item.file.name}-${i}`} className="rounded-lg border border-line bg-ink px-3.5 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="min-w-0 flex-1 truncate text-sm">{item.file.name}</span>
                <span
                  className={`text-xs font-medium ${
                    item.status === "error"
                      ? "text-red-400"
                      : item.status === "done"
                        ? "text-emerald-400"
                        : "text-fg-subtle"
                  }`}
                >
                  {STATUS_LABEL[item.status](item.progress)}
                </span>
              </div>

              {(item.status === "uploading" || item.status === "saving") && (
                <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-200"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
              )}

              {item.error && <p className="mt-1.5 text-xs text-red-400">{item.error}</p>}
            </li>
          ))}
        </ul>
      )}

      {queue.length > 0 && (
        <div className="mt-5 flex gap-3">
          <Button onClick={startUpload} disabled={busy || allDone}>
            <UploadIcon size={16} />
            {busy
              ? "Uploading…"
              : allDone
                ? "All uploaded"
                : `Upload ${pendingCount} file${pendingCount === 1 ? "" : "s"}`}
          </Button>
          <Button variant="secondary" onClick={() => setQueue([])} disabled={busy}>
            Clear list
          </Button>
        </div>
      )}
    </Card>
  );
}

const STATUS_LABEL: Record<QueueItem["status"], (progress: number) => string> = {
  pending: () => "Ready",
  uploading: (p) => `${p}%`,
  saving: () => "Saving…",
  done: () => "Uploaded",
  error: () => "Failed",
};
