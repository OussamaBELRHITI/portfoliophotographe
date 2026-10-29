import Image from "next/image";
import Link from "next/link";
import { blurProps, displayUrl, posterUrl } from "@/lib/format";
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
/**
 * The call-to-action pill, shared by both hero buttons and matching the Contact page's
 * "Send an email" button — one CTA shape across the site rather than a different treatment per
 * page. The glow is a wide, soft, accent-tinted shadow; a tighter one would read as a raised
 * edge rather than light coming off the button.
 */
const CTA_CLASS =
  "rounded-full bg-accent px-9 py-3.5 text-[11px] font-semibold tracking-[0.22em] text-ink uppercase shadow-[0_12px_40px_-12px_rgba(200,168,130,0.6)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_16px_50px_-12px_rgba(200,168,130,0.8)]";

export function Hero({ media, settings }: { media: Media | null; settings: SiteSettings }) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const eyebrow = settings.heroEyebrow ?? SETTINGS_FALLBACK.heroEyebrow;
  const tagline = settings.heroTagline ?? SETTINGS_FALLBACK.heroTagline;

  const isVideo = media?.type === "VIDEO";

  return (
    <section className="relative flex min-h-svh w-full items-center justify-center overflow-hidden">
      {media ? (
        isVideo ? (
          <video
            // A poster frame shows immediately while the video buffers, so the hero is never
            // an empty black rectangle on a slow connection.
            poster={posterUrl(media) ?? undefined}
            src={media.url}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 h-full w-full animate-fade-in object-cover"
          />
        ) : (
          <Image
            src={displayUrl(media)}
            alt=""
            fill
            priority
            sizes="100vw"
            {...blurProps(media)}
            unoptimized
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

      <div className="relative z-10 px-6 py-28 text-center">
        <p className="animate-fade-up text-xs tracking-[0.38em] text-accent uppercase [animation-delay:200ms] sm:text-sm sm:tracking-[0.42em]">
          {eyebrow}
        </p>
        <h1 className="animate-fade-up mt-5 font-display text-5xl leading-[0.92] font-black tracking-[-0.015em] [overflow-wrap:anywhere] uppercase sm:text-6xl [animation-delay:350ms] md:text-8xl lg:text-9xl">
          {siteName}
        </h1>
        <p className="animate-fade-up mx-auto mt-6 max-w-xl text-sm leading-relaxed text-fg-muted [animation-delay:500ms] sm:text-base">
          {tagline}
        </p>

        <div className="animate-fade-up mt-12 flex flex-col items-center justify-center gap-4 [animation-delay:650ms] sm:flex-row">
          <Link
            href="#work"
            className={CTA_CLASS}
          >
            View Photos
          </Link>
          <Link
            href="/contact"
            className={CTA_CLASS}
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
