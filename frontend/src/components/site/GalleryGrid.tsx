"use client";

import Image from "next/image";
import { blurProps, displayUrl, thumbUrl } from "@/lib/format";
import { useLightbox } from "@/lib/useLightbox";
import type { Media } from "@/lib/types";
import { LightboxBackdrop, LightboxTopChrome, NavButton } from "./LightboxChrome";

/**
 * Masonry-style gallery with a lightbox.
 *
 * CSS columns give the staggered look without measuring anything in JS. `break-inside-avoid`
 * is what stops an image being split across a column boundary.
 */
export function GalleryGrid({ media }: { media: Media[] }) {
  const { openIndex, setOpenIndex, close, next, prev } = useLightbox(media.length);
  const active = openIndex === null ? null : media[openIndex];

  return (
    <>
      {/* 16px gutters rather than 6px: at near-zero spacing adjacent frames bleed into one
          another and the wall reads as a single busy texture instead of a set of photographs. */}
      <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 *:mb-4">
        {media.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setOpenIndex(i)}
            className="group relative block w-full break-inside-avoid overflow-hidden rounded-lg bg-surface-raised"
            aria-label={item.title ?? `Open image ${i + 1}`}
          >
            <Image
              src={thumbUrl(item)}
              alt={item.title ?? ""}
              width={item.width ?? 1200}
              height={item.height ?? 800}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={i < 4}
              {...blurProps(item)}
              unoptimized
              className="h-auto w-full object-cover transition-transform duration-900 ease-out group-hover:scale-[1.03]"
            />
            <div className="absolute inset-0 bg-black/0 transition-colors duration-500 group-hover:bg-black/20" />
            {item.title && (
              <span className="absolute bottom-4 left-4 translate-y-2 text-[10px] tracking-[0.2em] uppercase opacity-0 transition-all duration-400 group-hover:translate-y-0 group-hover:opacity-100">
                {item.title}
              </span>
            )}
          </button>
        ))}
      </div>

      {active && openIndex !== null && (
        <LightboxBackdrop onClose={close} ariaLabel={active.title ?? "Image viewer"}>
          <LightboxTopChrome index={openIndex} total={media.length} onClose={close} />

          {media.length > 1 && (
            <>
              <NavButton side="left" onClick={prev} />
              <NavButton side="right" onClick={next} />
            </>
          )}

          {/*
            The album strip: previous and next sit dim and receded at the edges rather than
            off-screen, so paging through the gallery reads as turning a page in a book instead
            of one photo being swapped for another. They're clickable too — the peek itself is
            the affordance, same as flicking to the next print in a stack.

            No stopPropagation on this row itself — it spans the full screen, so swallowing
            clicks here would swallow every click in the dialog, leaving no way to dismiss it
            except the close button. Only the actual photo (the figure below) and the peek
            buttons stop propagation, so clicking anywhere else — meaning the backdrop, in
            practice — still closes the viewer.
          */}
          <div className="relative flex h-full w-full items-center justify-center">
            {media.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Previous image"
                className="absolute left-[4%] hidden h-[50vh] w-[26vw] cursor-pointer overflow-hidden rounded-sm opacity-40 saturate-50 blur-[1.5px] transition-all duration-500 hover:opacity-65 sm:block"
              >
                <Image
                  src={displayUrl(media[(openIndex - 1 + media.length) % media.length])}
                  alt=""
                  fill
                  // Deliberately the same hint as the centre image below, not the peek's actual
                  // 26vw box — matching `sizes` is what makes next/image request the identical
                  // cached variant when this photo gets promoted to the centre, instead of
                  // fetching it a second time at a different width.
                  sizes="100vw"
                  unoptimized
                  className="object-cover"
                />
              </button>
            )}

            {/* Keyed to the image id so every navigation remounts the frame and replays the
                settle-in animation, rather than the src just snapping to the new photo.
                A dark "mat" (surface tone) is indistinguishable from the ink backdrop behind
                it — this needs a border with actual contrast, not a tonal step nobody can see,
                plus a shadow dark enough to read against near-black instead of vanishing into
                it. */}
            <figure
              key={active.id}
              className="animate-lightbox-in relative z-10 flex max-h-[88vh] flex-col items-center px-4"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={displayUrl(active)}
                alt={active.title ?? ""}
                width={active.width ?? 1600}
                height={active.height ?? 1067}
                sizes="100vw"
                {...blurProps(active)}
                unoptimized
                className="max-h-[72vh] w-auto rounded-sm border border-accent/40 object-contain shadow-[0_30px_90px_-20px_rgba(0,0,0,0.95)]"
              />
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

            {media.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Next image"
                className="absolute right-[4%] hidden h-[50vh] w-[26vw] cursor-pointer overflow-hidden rounded-sm opacity-40 saturate-50 blur-[1.5px] transition-all duration-500 hover:opacity-65 sm:block"
              >
                <Image
                  src={displayUrl(media[(openIndex + 1) % media.length])}
                  alt=""
                  fill
                  sizes="100vw"
                  unoptimized
                  className="object-cover"
                />
              </button>
            )}
          </div>
        </LightboxBackdrop>
      )}
    </>
  );
}
