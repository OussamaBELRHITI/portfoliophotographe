import Image from "next/image";
import Link from "next/link";
import type { SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";
import { Reveal } from "./Reveal";

/** How many paragraphs of the bio the home page shows before handing off to /about. */
const PREVIEW_PARAGRAPHS = 2;

/**
 * Home page biography: the words on the left, the photographer's portrait on the right.
 *
 * Reads the same About copy and portrait the photographer edits in Dashboard → Settings, so
 * the home page and /about can never disagree. On small screens the portrait moves above the
 * text, since a face is the stronger opening there.
 */
export function Biography({ settings }: { settings: SiteSettings }) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const portrait = settings.aboutPortraitUrl;

  const paragraphs = (settings.aboutBody ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const preview = paragraphs.slice(0, PREVIEW_PARAGRAPHS);

  return (
    <section id="biography" className="border-t border-line">
      <div className="mx-auto grid max-w-350 items-center gap-14 px-6 py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-24 lg:px-12 lg:py-32">
        <Reveal className="order-2 lg:order-1">
          <p className="text-[11px] font-medium tracking-[0.3em] text-accent uppercase">
            Biography
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            {siteName}
          </h2>
          <div className="mt-6 h-px w-16 bg-accent" />

          {preview.length > 0 ? (
            <div className="mt-8 space-y-5">
              {preview.map((p, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-lg leading-relaxed text-fg"
                      : "text-[15px] leading-[1.85] text-fg-muted"
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-8 text-[15px] leading-relaxed text-fg-muted">
              {settings.heroTagline ?? SETTINGS_FALLBACK.heroTagline}
            </p>
          )}

          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
            <Link
              href="/about"
              className="inline-block border border-fg/30 px-8 py-3.5 text-[11px] font-medium tracking-[0.22em] uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
            >
              Read My Story
            </Link>
            <Link
              href="/contact"
              className="group inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.22em] text-fg-muted uppercase transition-colors hover:text-accent"
            >
              Get in Touch
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </Reveal>

        <Reveal delay={120} className="order-1 lg:order-2">
          <Portrait url={portrait} name={siteName} />
        </Reveal>
      </div>
    </section>
  );
}

/**
 * The framed portrait. Three layers give it depth against the near-black page, where a plain
 * black drop shadow would be invisible: a soft warm glow spread on the background behind it,
 * an offset accent outline, and a tight dark shadow that lifts the photo off the outline.
 * Corners are rounded to match.
 */
function Portrait({ url, name }: { url?: string | null; name: string }) {
  return (
    <div className="relative isolate mx-auto w-full max-w-md lg:max-w-none">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[3rem] bg-accent/15 blur-3xl sm:-inset-14"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 translate-x-4 translate-y-4 rounded-3xl border border-accent/40 sm:translate-x-6 sm:translate-y-6"
      />
      {/* `isolate` keeps the rounded clip intact while the photo scales on hover (Safari). */}
      <div className="relative isolate aspect-4/5 overflow-hidden rounded-3xl bg-surface-raised shadow-[0_40px_100px_-24px_rgba(200,168,130,0.45),0_24px_50px_-12px_rgba(0,0,0,0.95)] ring-1 ring-white/10">
        {url ? (
          <Image
            src={url}
            alt={`Portrait of ${name}`}
            fill
            sizes="(max-width: 1024px) 90vw, 45vw"
            // A pasted non-Cloudinary link would otherwise be rejected by next/image's host
            // allow-list and take the whole page down with it.
            unoptimized
            className="object-cover transition-transform duration-700 hover:scale-[1.03]"
          />
        ) : (
          // No portrait uploaded yet: a monogram keeps the layout intact instead of collapsing
          // the column and leaving the text stranded.
          <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-surface-raised to-ink">
            <span className="text-8xl font-light tracking-widest text-fg-subtle">
              {name.trim().charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
