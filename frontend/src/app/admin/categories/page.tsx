"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  TrashIcon,
} from "@/components/admin/icons";
import { MediaThumb } from "@/components/admin/MediaThumb";
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PageHeader,
  Spinner,
  Textarea,
  Toggle,
} from "@/components/admin/ui";
import { adminApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category } from "@/lib/types";

interface FormState {
  id?: number;
  name: string;
  slug: string;
  description: string;
  visible: boolean;
}

const EMPTY: FormState = { name: "", slug: "", description: "", visible: false };

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    try {
      setCategories(await adminApi.categories(token));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Wrapped rather than calling load() directly: keeps the state updates out of the
  // synchronous effect body, and `active` avoids a late response landing after unmount.
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

  function openForm(state: FormState) {
    setForm(state);
    setFieldErrors({});
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!token || !form) return;

    setBusy(true);
    setError(null);
    setFieldErrors({});

    const body = {
      name: form.name,
      // Send undefined rather than "" so the backend derives the slug from the name.
      slug: form.slug.trim() || undefined,
      description: form.description.trim() || undefined,
      visible: form.visible,
    };

    try {
      if (form.id) await adminApi.updateCategory(token, form.id, body);
      else await adminApi.createCategory(token, body);
      setForm(null);
      await load();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError("Something went wrong");
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleVisible(category: Category) {
    if (!token) return;
    // Optimistic: the switch should feel instant. Reverted by load() if the call fails.
    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? { ...c, visible: !c.visible } : c)),
    );
    try {
      await adminApi.setCategoryVisibility(token, category.id, !category.visible);
    } catch {
      setError("Could not change visibility");
    } finally {
      load();
    }
  }

  async function move(index: number, direction: -1 | 1) {
    if (!token) return;
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;

    const reordered = [...categories];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setCategories(reordered);

    try {
      await adminApi.reorderCategories(token, reordered.map((c) => c.id));
    } catch {
      setError("Could not save the new order");
      load();
    }
  }

  async function remove(category: Category) {
    if (!token) return;
    const ok = window.confirm(
      `Delete "${category.name}"?\n\nIts ${category.mediaCount} media item(s) will be kept but moved out of any gallery. This cannot be undone.`,
    );
    if (!ok) return;

    try {
      await adminApi.deleteCategory(token, category.id);
      if (form?.id === category.id) setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete category");
    }
  }

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Your galleries. Hidden ones stay saved but aren't shown on the website."
        actions={
          !form && (
            <Button onClick={() => openForm(EMPTY)}>
              <PlusIcon size={16} /> New category
            </Button>
          )
        }
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      {form && (
        <Card className="mb-8 p-6">
          <form onSubmit={save} className="space-y-5">
            <h2 className="text-base font-semibold">
              {form.id ? `Edit “${form.name || "category"}”` : "New category"}
            </h2>

            <div className="grid gap-5 sm:grid-cols-2">
              <Input
                label="Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                error={fieldErrors.name}
                placeholder="e.g. Weddings"
                required
                autoFocus
              />
              <Input
                label="Web address (optional)"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                error={fieldErrors.slug}
                placeholder="created from the name"
                hint={form.slug || form.name ? `/work/${form.slug || slugPreview(form.name)}` : undefined}
              />
            </div>

            <Textarea
              label="Description"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={fieldErrors.description}
              placeholder="A short line shown under the gallery title."
            />

            <div className="flex items-center gap-3 rounded-lg border border-line bg-ink px-4 py-3">
              <Toggle
                checked={form.visible}
                onChange={(v) => setForm({ ...form, visible: v })}
                label="Visible on the public site"
              />
              <span className="text-sm text-fg-muted">
                {form.visible ? "Published — visible on the website" : "Hidden — only you can see it"}
              </span>
            </div>

            <div className="flex gap-3 pt-1">
              <Button type="submit" disabled={busy}>
                {busy ? "Saving…" : form.id ? "Save changes" : "Create category"}
              </Button>
              <Button variant="secondary" onClick={() => setForm(null)} disabled={busy}>
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {categories.length > 0 ? (
        <Card className="divide-y divide-line overflow-hidden">
          {categories.map((category, i) => (
            <div
              key={category.id}
              className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:bg-surface-raised/40 sm:flex-nowrap"
            >
              <div className="flex flex-col">
                <IconButton label="Move up" onClick={() => move(i, -1)} disabled={i === 0} className="h-6">
                  <ChevronUpIcon size={16} />
                </IconButton>
                <IconButton
                  label="Move down"
                  onClick={() => move(i, 1)}
                  disabled={i === categories.length - 1}
                  className="h-6"
                >
                  <ChevronDownIcon size={16} />
                </IconButton>
              </div>

              <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-surface-raised">
                {category.coverImageUrl ? (
                  <MediaThumb
                    item={{ url: category.coverImageUrl, type: "IMAGE", title: category.name }}
                    width={200}
                    sizes="80px"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-fg-subtle">
                    <FolderIcon size={18} />
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{category.name}</p>
                  <Badge tone={category.visible ? "success" : "muted"}>
                    {category.visible ? "Published" : "Hidden"}
                  </Badge>
                </div>
                <p className="mt-0.5 truncate text-sm text-fg-subtle">
                  /work/{category.slug} · {category.mediaCount}{" "}
                  {category.mediaCount === 1 ? "item" : "items"}
                </p>
              </div>

              <div className="flex items-center gap-1">
                <div className="mr-3">
                  <Toggle
                    checked={category.visible}
                    onChange={() => toggleVisible(category)}
                    label={category.visible ? `Hide ${category.name}` : `Publish ${category.name}`}
                  />
                </div>
                <IconButton
                  label={`Edit ${category.name}`}
                  onClick={() =>
                    openForm({
                      id: category.id,
                      name: category.name,
                      slug: category.slug,
                      description: category.description ?? "",
                      visible: category.visible,
                    })
                  }
                >
                  <PencilIcon size={16} />
                </IconButton>
                <IconButton label={`Delete ${category.name}`} tone="danger" onClick={() => remove(category)}>
                  <TrashIcon size={16} />
                </IconButton>
              </div>
            </div>
          ))}
        </Card>
      ) : (
        !form && (
          <EmptyState
            icon={<FolderIcon />}
            title="No categories yet"
            body="Create one to start organising your galleries."
            action={
              <Button onClick={() => openForm(EMPTY)}>
                <PlusIcon size={16} /> New category
              </Button>
            }
          />
        )
      )}
    </div>
  );
}

/** Mirrors the backend's slug derivation closely enough for a live preview. */
function slugPreview(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
