"use client";

import { useEffect, useRef, useState } from "react";
import { adminApi, ApiError, uploadToCloudinary } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Media } from "@/lib/types";
import { ImageIcon, TrashIcon, UploadIcon, XIcon } from "./icons";
import { MediaThumb } from "./MediaThumb";
import { Button, Spinner } from "./ui";

/**
 * An image setting (portrait, page banner) the photographer can fill three ways: upload a new
 * file, pick one already in the media library, or paste a link. Replaces bare URL inputs that
 * asked him to copy Cloudinary links around by hand.
 *
 * A file uploaded here goes to Cloudinary only — it is deliberately not registered as a media
 * item, so a portrait can never turn up inside a gallery or be picked as the home page hero.
 */
export function ImageField({
  label,
  hint,
  value,
  onChange,
  shape = "wide",
  error,
}: {
  label: string;
  hint?: string;
  value: string | null | undefined;
  onChange: (url: string) => void;
  shape?: "portrait" | "wide";
  error?: string;
}) {
  const { token } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [showLink, setShowLink] = useState(false);

  async function upload(file: File) {
    if (!token) return;
    setUploadError(null);
    setProgress(0);
    try {
      const sig = await adminApi.uploadSignature(token);
      const result = await uploadToCloudinary(file, sig, setProgress);
      onChange(result.secure_url);
    } catch (err) {
      setUploadError(
        err instanceof ApiError || err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setProgress(null);
    }
  }

  const frame =
    shape === "portrait" ? "aspect-4/5 w-full max-w-44" : "aspect-video w-full max-w-72";

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-fg">{label}</p>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div
          className={`relative shrink-0 overflow-hidden rounded-lg border border-line bg-ink ${frame}`}
        >
          {value ? (
            <MediaThumb item={{ url: value, type: "IMAGE", title: label }} width={500} sizes="300px" />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-fg-subtle">
              <ImageIcon size={22} />
              <span className="text-xs">No image</span>
            </div>
          )}
          {progress !== null && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70">
              <span className="text-sm font-medium">{progress}%</span>
              <div className="h-1 w-2/3 overflow-hidden rounded-full bg-line">
                <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={progress !== null}
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon size={14} /> Upload
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setLibraryOpen(true)}>
              <ImageIcon size={14} /> Choose from library
            </Button>
            {value && (
              <Button variant="ghost" size="sm" onClick={() => onChange("")}>
                <TrashIcon size={14} /> Remove
              </Button>
            )}
          </div>

          {hint && <p className="text-xs text-fg-subtle">{hint}</p>}

          {showLink ? (
            <input
              value={value ?? ""}
              onChange={(e) => onChange(e.target.value)}
              placeholder="https://res.cloudinary.com/…"
              className="h-9 w-full rounded-lg border border-line bg-ink px-3 text-xs text-fg outline-none focus:border-accent"
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowLink(true)}
              className="text-xs text-fg-subtle underline-offset-2 hover:text-fg hover:underline"
            >
              or paste an image link
            </button>
          )}

          {(uploadError || error) && (
            <p className="text-xs text-red-400">{uploadError ?? error}</p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />

      {libraryOpen && (
        <LibraryDialog
          onClose={() => setLibraryOpen(false)}
          onPick={(url) => {
            onChange(url);
            setLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
}

function LibraryDialog({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (url: string) => void;
}) {
  const { token } = useAuth();
  const [items, setItems] = useState<Media[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    adminApi
      .media(token)
      .then((all) => setItems(all.filter((m) => m.type === "IMAGE")))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load media"));
  }, [token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose an image"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold">Choose from your library</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-fg-subtle hover:bg-surface-raised hover:text-fg"
          >
            <XIcon size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : !items ? (
            <Spinner />
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-fg-subtle">
              No photos yet. Upload some on the Media page first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onPick(m.url)}
                  className="group relative aspect-square overflow-hidden rounded-lg bg-surface-raised ring-accent transition hover:ring-2 focus-visible:ring-2"
                >
                  <MediaThumb item={m} width={300} sizes="180px" className="transition-transform duration-500 group-hover:scale-105" />
                  {m.title && (
                    <span className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-black/80 to-transparent px-2 pt-4 pb-1.5 text-left text-xs text-white">
                      {m.title}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
