"use client";

import Image from "next/image";
import { blurProps, cloudinaryVideoPoster, formatDuration } from "@/lib/format";
import { useLightbox } from "@/lib/useLightbox";
import type { Media } from "@/lib/types";
import { LightboxBackdrop, LightboxTopChrome, NavButton } from "./LightboxChrome";

/**
 * Videos render as poster frames in the grid; clicking one opens the same album-style lightbox
 * as the photo galleries, playing the film centre-stage with neighbours peeking at the edges.
 *
 * Deliberate: a grid of autoplaying videos would pull tens of megabytes on load. The poster is
 * a Cloudinary-generated still (`so_0`), so it costs one image until the visitor opts in.
 */
export function VideoGrid({ videos }: { videos: Media[] }) {
  const { openIndex, setOpenIndex, close, next, prev } = useLightbox(videos.length);
  const active = openIndex === null ? null : videos[openIndex];

  return (
    <>
      <div className="grid gap-1.5 md:grid-cols-2">
        {videos.map((video, i) => (
          <button
            key={video.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative block aspect-video w-full overflow-hidden rounded-lg bg-surface-raised"
            aria-label={`Play ${video.title ?? "video"}`}
          >
            <VideoPoster video={video} priority={i < 2} />
            <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/10 to-transparent" />

            <span className="absolute top-1/2 left-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-fg/50 backdrop-blur-sm transition-all duration-300 group-hover:scale-110 group-hover:border-accent group-hover:bg-accent/20">
              <span className="ml-1 block h-0 w-0 border-y-9 border-l-15 border-y-transparent border-l-fg" />
            </span>

            <figcaption className="absolute inset-x-0 bottom-0 flex items-end justify-between p-6 text-left">
              <span>
                {video.title && (
                  <span className="block text-sm uppercase tracking-[0.2em]">{video.title}</span>
                )}
                {video.description && (
                  <span className="mt-1.5 block max-w-md text-xs text-fg-muted">
                    {video.description}
                  </span>
                )}
              </span>
              {video.durationSeconds != null && (
                <span className="shrink-0 text-[10px] tracking-[0.18em] text-fg-subtle">
                  {formatDuration(video.durationSeconds)}
                </span>
              )}
            </figcaption>
          </button>
        ))}
      </div>

      {active && openIndex !== null && (
        <LightboxBackdrop onClose={close} ariaLabel={active.title ?? "Film viewer"}>
          <LightboxTopChrome index={openIndex} total={videos.length} onClose={close} />

          {videos.length > 1 && (
            <>
              <NavButton side="left" onClick={prev} />
              <NavButton side="right" onClick={next} />
            </>
          )}

          {/* Same album-strip concept as the photo lightbox: dim poster peeks of the
              neighbouring films at the edges, the active one playing full-contrast in the
              centre. No stopPropagation on this row — see GalleryGrid for why. */}
          <div className="relative flex h-full w-full items-center justify-center">
            {videos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous film"
                className="absolute left-[4%] hidden h-[50vh] w-[26vw] cursor-pointer overflow-hidden rounded-sm opacity-40 saturate-50 blur-[1.5px] transition-all duration-500 hover:opacity-65 sm:block"
              >
                <VideoPoster
                  video={videos[(openIndex - 1 + videos.length) % videos.length]}
                  peek
                />
              </button>
            )}

            {/* Keyed to the video id so every navigation remounts the player and replays the
                settle-in animation, matching the photo lightbox rather than a hard content
                swap. Not muted and set to autoplay — opening this is a direct result of a
                click, which is exactly the gesture browsers require to allow audio autoplay. */}
            <figure
              key={active.id}
              className="animate-lightbox-in relative z-10 flex max-h-[88vh] flex-col items-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <video
                src={active.url}
                controls
                autoPlay
                playsInline
                className="max-h-[72vh] w-auto rounded-sm border border-accent/40 object-contain shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)]"
              >
                <track kind="captions" />
              </video>
              {(active.title || active.description) && (
                <figcaption className="mt-7 text-center">
                  {active.title && (
                    <p className="font-display text-lg tracking-[0.14em] uppercase">
                      {active.title}
                    </p>
                  )}
                  {active.description && (
                    <p className="mt-2 max-w-xl text-sm text-fg-muted">{active.description}</p>
                  )}
                </figcaption>
              )}
            </figure>

            {videos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next film"
                className="absolute right-[4%] hidden h-[50vh] w-[26vw] cursor-pointer overflow-hidden rounded-sm opacity-40 saturate-50 blur-[1.5px] transition-all duration-500 hover:opacity-65 sm:block"
              >
                <VideoPoster video={videos[(openIndex + 1) % videos.length]} peek />
              </button>
            )}
          </div>
        </LightboxBackdrop>
      )}
    </>
  );
}

/**
 * A video's still frame — Cloudinary's `so_0` transform for Cloudinary-hosted footage, or the
 * browser's own first frame via a muted, non-playing <video> for anything hosted elsewhere.
 * Shared between the grid thumbnails and the lightbox peeks so both degrade the same way.
 *
 * `peek` distinguishes the two call sites: the grid thumbnail gets a hover zoom and a smaller
 * transform, the lightbox peek needs neither (it's already dim and small) but wants the same
 * width as the eventual centre player — see GalleryGrid's peek comment for why that matters.
 */
function VideoPoster({
  video,
  priority = false,
  peek = false,
}: {
  video: Media;
  priority?: boolean;
  peek?: boolean;
}) {
  if (!video.url.includes("/upload/")) {
    return (
      <video
        src={video.url}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
    );
  }

  return (
    <Image
      src={cloudinaryVideoPoster(video.url, peek ? 1600 : 1200)}
      alt={video.title ?? ""}
      fill
      sizes={peek ? "100vw" : "(max-width: 768px) 100vw, 50vw"}
      priority={priority}
      {...blurProps(video.url, true)}
      className={
        peek
          ? "object-cover"
          : "object-cover transition-transform duration-900 ease-out group-hover:scale-[1.03]"
      }
    />
  );
}
