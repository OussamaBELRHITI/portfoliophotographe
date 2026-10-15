import Image from "next/image";
import Link from "next/link";
import { blurProps, cloudinaryThumb, cloudinaryVideoPoster } from "@/lib/format";
import type { Media, SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";

/**
 * Full-bleed opening frame.
 *
 * <p>Takes whichever media the photographer flagged as featured. A video plays muted on loop
 * behind the type; a still gets a slow Ken Burns drift so the page breathes instead of sitting
 * flat. With no media at all it falls back to a purely typographic hero, which still looks
 * deliberate on a brand-new site.
 */
export function Hero({ media, settings }: { media: Media | null; settings: SiteSettings }) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const eyebrow = settings.heroEyebrow ?? SETTINGS_FALLBACK.heroEyebrow;
  const tagline = settings.heroTagline ?? SETTINGS_FALLBACK.heroTagline;

  const isVideo = media?.type === "VIDEO";

  return (
    <section className="relative flex h-svh min-h-140 w-full items-center justify-center overflow-hidden">
      {media ? (
        isVideo ? (
          <video
            // A poster frame shows immediately while the video buffers, so the hero is never
            // an empty black rectangle on a slow connection.
            poster={cloudinaryVideoPoster(media.url, 1920)}
            src={media.url}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full animate-fade-in object-cover"
          />
        ) : (
          <Image
            src={cloudinaryThumb(media.url, 2400)}
            alt=""
            fill
            priority
            sizes="100vw"
            {...blurProps(media.url)}
            className="animate-ken-burns object-cover"
          />
        )
      ) : (
        <div className="absolute inset-0 bg-linear-to-br from-surface-raised via-ink to-surface" />
      )}

      {/*
        Two overlays: a vertical wash for nav legibility, plus a vignette that keeps some
        darkening at the centre — the headline sits there, and over a bright frame the small
        tracked-out eyebrow would otherwise fall below a readable contrast ratio.
      */}
      <div className="absolute inset-0 bg-linear-to-b from-black/45 via-black/15 to-black/60" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.28)_0%,rgba(0,0,0,0.18)_45%,rgba(0,0,0,0.5)_100%)]" />

      <div className="relative z-10 px-6 text-center">
        <p className="animate-fade-up text-[10px] tracking-[0.4em] text-accent uppercase [animation-delay:200ms]">
          {eyebrow}
        </p>
        <h1 className="animate-fade-up mt-6 font-display text-5xl leading-[1.05] font-light tracking-[0.06em] uppercase [animation-delay:350ms] sm:text-7xl lg:text-8xl">
          {siteName}
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-xl text-sm leading-relaxed text-fg-muted [animation-delay:500ms] sm:text-base">
          {tagline}
        </p>

        <div className="animate-fade-up mt-12 flex flex-col items-center justify-center gap-4 [animation-delay:650ms] sm:flex-row">
          <Link
            href="#work"
            className="border border-fg/50 px-9 py-3.5 text-[11px] font-medium tracking-[0.24em] text-fg uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
          >
            View Photos
          </Link>
          <Link
            href="/contact"
            className="border border-fg/25 px-9 py-3.5 text-[11px] font-medium tracking-[0.24em] text-fg/90 uppercase transition-all duration-300 hover:border-accent hover:text-accent-bright"
          >
            Get in Touch
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="h-14 w-px animate-pulse bg-linear-to-b from-transparent via-fg-subtle to-transparent" />
      </div>
    </section>
  );
}
