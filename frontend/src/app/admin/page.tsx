"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  ChevronRightIcon,
  EyeOffIcon,
  ExternalIcon,
  FolderIcon,
  ImageIcon,
  SettingsIcon,
  UploadIcon,
  VideoIcon,
} from "@/components/admin/icons";
import { MediaThumb } from "@/components/admin/MediaThumb";
import { Alert, Card, EmptyState, PageHeader, Spinner } from "@/components/admin/ui";
import { adminApi, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { Category, Media } from "@/lib/types";

export default function AdminOverviewPage() {
  const { token, username } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    Promise.all([adminApi.categories(token), adminApi.media(token)])
      .then(([c, m]) => {
        setCategories(c);
        setMedia(m);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Could not load the dashboard"),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <Spinner />;

  const videos = media.filter((m) => m.type === "VIDEO").length;
  const photos = media.length - videos;
  const visibleCategories = categories.filter((c) => c.visible).length;
  const recent = [...media]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 12);
  const hidden = media.filter((m) => !m.visible).length;

  return (
    <div>
      <PageHeader
        title={`Welcome back${username ? `, ${username}` : ""}`}
        description="Here's what's on your website right now."
      />

      {error && (
        <div className="mb-6">
          <Alert kind="error">{error}</Alert>
        </div>
      )}

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={<FolderIcon />} label="Galleries" value={categories.length} hint={`${visibleCategories} published`} />
        <Stat icon={<ImageIcon />} label="Photos" value={photos} />
        <Stat icon={<VideoIcon />} label="Videos" value={videos} />
        <Stat
          icon={<EyeOffIcon />}
          label="Hidden"
          value={hidden}
          hint={hidden === 0 ? "everything is visible" : "not shown on the website"}
        />
      </div>

      <Card className="p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent uploads</h2>
          <Link
            href="/admin/media"
            className="flex items-center gap-1 text-sm text-fg-muted transition-colors hover:text-accent"
          >
            All media <ChevronRightIcon size={15} />
          </Link>
        </div>

        {recent.length > 0 ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {recent.map((m) => (
              <Link
                key={m.id}
                href="/admin/media"
                className="group relative aspect-square overflow-hidden rounded-lg bg-surface-raised"
              >
                <MediaThumb
                  item={m}
                  width={300}
                  sizes="160px"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                {m.type === "VIDEO" && (
                  <span className="absolute top-1.5 left-1.5 rounded bg-black/70 p-1 text-white">
                    <VideoIcon size={12} />
                  </span>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<UploadIcon />}
            title="No uploads yet"
            body="Your photos and videos will show up here."
          />
        )}
      </Card>

      <h2 className="mt-10 mb-4 text-base font-semibold">Quick actions</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/admin/media" icon={<UploadIcon />} title="Upload media" body="Add photos or videos" />
        <QuickLink href="/admin/categories" icon={<FolderIcon />} title="Galleries" body="Create, reorder, publish" />
        <QuickLink href="/admin/settings" icon={<SettingsIcon />} title="Site content" body="Bio, portrait, contact" />
        <QuickLink href="/" icon={<ExternalIcon />} title="View website" body="See what visitors see" external />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: number | string;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{label}</p>
        <span className="text-fg-subtle">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-fg-subtle">{hint}</p>}
    </Card>
  );
}

function QuickLink({
  href,
  icon,
  title,
  body,
  external,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className="group flex items-center gap-4 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-raised"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/12 text-accent">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{title}</span>
        <span className="block text-xs text-fg-subtle">{body}</span>
      </span>
    </Link>
  );
}
