"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  StarIcon,
  TrashIcon,
} from "@/components/admin/icons";
import { MediaThumb } from "@/components/admin/MediaThumb";
import { MediaUploader } from "@/components/admin/MediaUploader";
import {
  Alert,
  Badge,
  Card,
  EmptyState,
  IconButton,
  PageHeader,
  Spinner,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatBytes, formatDuration } from "@/lib/format";
import type { Category, Media } from "@/lib/types";

export default function MediaPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [filter, setFilter] = useState<number | "all" | "unfiled">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const [c, m] = await Promise.all([adminApi.categories(token), adminApi.media(token)]);
      setCategories(c);
      setMedia(m);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load media");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      if (active) await load();
    };
    void run();
    return () => {
      active = false;
    };
  }, [load]);

  const visible =
    filter === "all"
      ? media
      : filter === "unfiled"
        ? media.filter((m) => m.categoryId == null)
        : media.filter((m) => m.categoryId === filter);

  // Sorted by displayOrder so the arrows below match what the public gallery shows.
  const ordered = [...visible].sort((a, b) => a.displayOrder - b.displayOrder);

  async function toggleVisible(item: Media) {
    if (!token) return;
    setMedia((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, visible: !m.visible } : m)),
    );
    try {
      await adminApi.updateMedia(token, item.id, { visible: !item.visible });
    } catch {
      setError("Could not change visibility");
      load();
    }
  }

  /**
   * Marks an item as the home page hero. Demotes any other featured item first, so the button
   * reads as "make this the hero" rather than leaving several competing for the slot.
   */
  async function makeFeatured(item: Media) {
    if (!token) return;

    const previouslyFeatured = media.filter((m) => m.featured && m.id !== item.id);
    setMedia((prev) =>
      prev.map((m) => ({ ...m, featured: m.id === item.id ? !item.featured : false })),
    );

    try {
      await Promise.all([
        adminApi.updateMedia(token, item.id, { featured: !item.featured }),
        ...previouslyFeatured.map((m) =>
          adminApi.updateMedia(token, m.id, { featured: false }),
        ),
      ]);
    } catch {
      setError("Could not update the hero image");
    } finally {
      load();
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!token) return;
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;

    const reordered = [...ordered];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

    // Reflect the new order locally straight away.
    setMedia((prev) =>
      prev.map((m) => {
        const idx = reordered.findIndex((r) => r.id === m.id);
        return idx === -1 ? m : { ...m, displayOrder: idx };
      }),
    );

    try {
      await adminApi.reorderMedia(token, reordered.map((m) => m.id));
    } catch {
      setError("Could not save the new order");
      load();
    }
  }

  async function remove(item: Media) {
    if (!token) return;
    const ok = window.confirm(
      `Delete "${item.title ?? "this item"}"?\n\nThis also removes the file from Cloudinary and cannot be undone.`,
    );
    if (!ok) return;

    try {
      await adminApi.deleteMedia(token, item.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.message}${err.status === 422 ? " — the database row was kept, so you can retry." : ""}`
          : "Could not delete",
      );
    }
  }

  async function copyUrl(item: Media) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      // Clears itself, but only if the user hasn't already copied a different item in the
      // meantime — otherwise a slow first timeout could wipe out a second item's "Copied" state.
      setTimeout(() => setCopiedId((current) => (current === item.id ? null : current)), 1600);
    } catch {
      setError("Could not copy — your browser may be blocking clipboard access");
    }
  }

  async function changeCategory(item: Media, newCategoryId: number | "") {
    if (!token) return;
    try {
      await adminApi.updateMedia(
        token,
        item.id,
        newCategoryId === ""
          ? { removeFromCategory: true }
          : { categoryId: Number(newCategoryId) },
      );
      await load();
    } catch {
      setError("Could not move item");
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Media"
        description="Upload photos and videos, choose the home page hero, and arrange each gallery."
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">
            <div className="flex items-start justify-between gap-4">
              <span>{error}</span>
              <button type="button" onClick={() => setError(null)} className="text-xs underline">
                Dismiss
              </button>
            </div>
          </Alert>
        </div>
      )}

      <div className="mb-8">
        <MediaUploader
          // Remount when the filter changes so the "Add to gallery" default follows it.
          key={String(filter)}
          categories={categories}
          defaultCategoryId={typeof filter === "number" ? filter : null}
          onUploaded={load}
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <FilterChip active={filter === "all"} onClick={() => setFilter("all")} count={media.length}>
          All
        </FilterChip>
        {categories.map((c) => (
          <FilterChip
            key={c.id}
            active={filter === c.id}
            onClick={() => setFilter(c.id)}
            count={media.filter((m) => m.categoryId === c.id).length}
          >
            {c.name}
          </FilterChip>
        ))}
        <FilterChip
          active={filter === "unfiled"}
          onClick={() => setFilter("unfiled")}
          count={media.filter((m) => m.categoryId == null).length}
        >
          Unfiled
        </FilterChip>
      </div>

      {ordered.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {ordered.map((item, i) => (
            <Card
              key={item.id}
              className={`group overflow-hidden transition-colors hover:border-line-bright ${
                item.featured ? "border-accent/60" : ""
              }`}
            >
              <div className="relative aspect-4/3 bg-surface-raised">
                <MediaThumb
                  item={item}
                  width={500}
                  sizes="(max-width: 640px) 100vw, 300px"
                  className={item.visible ? "" : "opacity-40 grayscale"}
                />
                <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 [&>span]:bg-black/70 [&>span]:backdrop-blur-sm">
                  {item.featured && <Badge tone="accent">★ Hero</Badge>}
                  {item.type === "VIDEO" && (
                    <Badge tone="neutral">
                      Video{item.durationSeconds ? ` · ${formatDuration(item.durationSeconds)}` : ""}
                    </Badge>
                  )}
                  {!item.visible && <Badge tone="muted">Hidden</Badge>}
                </div>
              </div>

              <div className="p-3">
                <p className="truncate text-sm font-medium" title={item.title ?? undefined}>
                  {item.title ?? "Untitled"}
                </p>
                <p className="mt-0.5 truncate text-xs text-fg-subtle">
                  {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                  {formatBytes(item.bytes)}
                </p>

                <select
                  value={item.categoryId ?? ""}
                  onChange={(e) =>
                    changeCategory(item, e.target.value === "" ? "" : Number(e.target.value))
                  }
                  aria-label="Gallery"
                  className="mt-3 h-8 w-full cursor-pointer rounded-md border border-line bg-ink px-2 text-xs text-fg-muted outline-none focus:border-accent"
                >
                  <option value="">Unfiled</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <div className="mt-2 flex items-center justify-between border-t border-line pt-2">
                  <div className="flex">
                    <IconButton label="Move earlier" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ChevronLeftIcon size={16} />
                    </IconButton>
                    <IconButton
                      label="Move later"
                      onClick={() => move(i, 1)}
                      disabled={i === ordered.length - 1}
                    >
                      <ChevronRightIcon size={16} />
                    </IconButton>
                  </div>
                  <div className="flex">
                    <IconButton
                      label={item.featured ? "Remove as home page hero" : "Use as home page hero"}
                      active={item.featured}
                      onClick={() => makeFeatured(item)}
                    >
                      <StarIcon size={16} filled={item.featured} />
                    </IconButton>
                    <IconButton
                      label={item.visible ? "Hide from website" : "Show on website"}
                      onClick={() => toggleVisible(item)}
                    >
                      {item.visible ? <EyeIcon size={16} /> : <EyeOffIcon size={16} />}
                    </IconButton>
                    <IconButton
                      label={copiedId === item.id ? "Copied" : "Copy file URL"}
                      active={copiedId === item.id}
                      onClick={() => copyUrl(item)}
                    >
                      {copiedId === item.id ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
                    </IconButton>
                    <IconButton label="Delete" tone="danger" onClick={() => remove(item)}>
                      <TrashIcon size={16} />
                    </IconButton>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<ImageIcon />}
          title="Nothing here yet"
          body="Upload photos or videos using the panel above."
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  count,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
        active
          ? "border-accent bg-accent/12 text-accent"
          : "border-line text-fg-muted hover:border-line-bright hover:text-fg"
      }`}
    >
      {children}
      <span className={`text-xs ${active ? "text-accent/80" : "text-fg-subtle"}`}>{count}</span>
    </button>
  );
}
