"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Category, SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";

/** How long each gallery holds the background before the next one takes over. */
const ADVANCE_MS = 6000;
/** How long a card takes to grow from its place in the row to filling the screen. */
const FLIGHT_MS = 850;

/**
 * The call-to-action pill, matching the Contact page's "Send an email" button — one shape for
 * every primary action on the site. The glow is a wide, soft, accent-tinted shadow; a tighter
 * one would read as a raised edge rather than light coming off the button.
 */
const CTA_CLASS =
  "rounded-full bg-accent px-9 py-3.5 text-[11px] font-semibold tracking-[0.22em] text-ink uppercase shadow-[0_12px_40px_-12px_rgba(200,168,130,0.6)] transition-all duration-300 hover:bg-accent-bright hover:shadow-[0_16px_50px_-12px_rgba(200,168,130,0.8)]";

/** Where a card started, so the flying copy can begin exactly on top of it. */
interface Flight {
  index: number;
  url: string;
  from: { top: number; left: number; width: number; height: number };
  /** Set on the frame after mount, which is what the CSS transition animates towards. */
  expanded: boolean;
}

/**
 * The opening frame: one gallery's photograph fills the screen, and a row of cards offers the
 * others.
 *
 * <p>Choosing a gallery does not cross-fade. The card itself grows out of the row and opens
 * into the full frame, so the photograph the visitor pointed at is visibly the one that
 * arrives — the motion explains the result instead of merely producing it.
 *
 * <p>Laid out along the bottom rather than centred: the wordmark sits lower-left and the cards
 * lower-right, which leaves the cards room to be large enough to read as photographs instead
 * of thumbnails, and leaves the top half of the frame to the picture.
 */
export function HeroCarousel({
  categories,
  settings,
}: {
  categories: Category[];
  settings: SiteSettings;
}) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const eyebrow = settings.heroEyebrow ?? SETTINGS_FALLBACK.heroEyebrow;
  const tagline = settings.heroTagline ?? SETTINGS_FALLBACK.heroTagline;

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const total = categories.length;

  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  // Read inside timers and handlers that must not re-arm when the index changes.
  const activeRef = useRef(0);
  const flyingRef = useRef(false);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const prefersReducedMotion = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /**
   * Switches gallery, growing the chosen card into the background when one is on screen.
   *
   * <p>The background behind the flying card changes immediately, so by the time the card has
   * covered the frame the two agree and the copy can simply be removed — no second transition,
   * and nothing to snap back if the visitor interrupts it.
   */
  const go = useCallback(
    (next: number) => {
      const index = ((next % total) + total) % total;
      if (index === activeRef.current || flyingRef.current) return;

      const card = cardRefs.current[index];
      const url = categories[index].coverImageUrl;

      setActive(index);

      if (!card || !url || prefersReducedMotion()) return;

      const r = card.getBoundingClientRect();
      // A card scrolled out of view has nothing to grow from; the plain change is correct.
      if (r.width === 0 || r.bottom < 0 || r.top > window.innerHeight) return;

      flyingRef.current = true;
      setFlight({
        index,
        url,
        from: { top: r.top, left: r.left, width: r.width, height: r.height },
        expanded: false,
      });
    },
    [categories, total],
  );

  // Two frames before expanding: one for the browser to accept the starting geometry, a second
  // for it to paint it. Flipping on the very next frame risks the start and end being batched
  // into one style recalculation, which skips the animation entirely.
  useEffect(() => {
    if (!flight || flight.expanded) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() =>
        setFlight((f) => (f ? { ...f, expanded: true } : f)),
      );
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [flight]);

  // Clear the copy once it has covered the frame. A timer rather than `transitionend`, which
  // does not fire if the element is interrupted — and leaving a full-screen overlay behind
  // would be far worse than ending a touch early.
  useEffect(() => {
    if (!flight?.expanded) return;
    const timer = setTimeout(() => {
      setFlight(null);
      flyingRef.current = false;
    }, FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [flight]);

  useEffect(() => {
    if (paused || total < 2 || prefersReducedMotion()) return;
    const timer = setInterval(() => go(activeRef.current + 1), ADVANCE_MS);
    return () => clearInterval(timer);
  }, [paused, total, go]);

  if (total === 0) return null;

  const current = categories[active];

  return (
    <section
      className="relative h-svh min-h-160 w-full overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      // Pausing on focus matters as much as on hover: a keyboard user tabbing through the
      // cards would otherwise have the background change underneath them mid-decision.
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured galleries"
    >
      {categories.map((category, i) => (
        <div
          key={category.id}
          className={`absolute inset-0 transition-opacity duration-700 ease-out ${
            i === active ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={i !== active}
        >
          {category.coverImageUrl && (
            <Image
              src={category.coverImageUrl}
              alt=""
              fill
              // Only the first is urgent; the rest load normally rather than competing with it.
              priority={i === 0}
              sizes="100vw"
              unoptimized
              className={`object-cover ${i === active ? "animate-ken-burns" : ""}`}
            />
          )}
        </div>
      ))}

      {/*
        The flying copy. Fixed and above everything, it starts exactly where the card was and
        grows to the viewport; `will-change` keeps the browser from re-rasterising the photo on
        every frame of the size change.
      */}
      {flight && (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed z-30 overflow-hidden"
          style={{
            top: flight.expanded ? 0 : flight.from.top,
            left: flight.expanded ? 0 : flight.from.left,
            width: flight.expanded ? "100vw" : flight.from.width,
            height: flight.expanded ? "100vh" : flight.from.height,
            borderRadius: flight.expanded ? 0 : "1rem",
            transition: `all ${FLIGHT_MS}ms cubic-bezier(0.65, 0, 0.35, 1)`,
            willChange: "top, left, width, height",
          }}
        >
          {/* A plain <img>: next/image would re-request a different candidate as the box grows,
              and the file is already in cache from the card that spawned this. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={flight.url} alt="" className="h-full w-full object-cover" />
        </div>
      )}

      {/*
        Weighted to the bottom, where the type sits, rather than an even wash: the upper half of
        a landscape is usually its brightest part and darkening it evenly would flatten the
        photograph for no benefit.
      */}
      <div className="absolute inset-0 z-40 bg-linear-to-b from-black/55 via-black/20 to-black/85" />
      <div className="absolute inset-0 z-40 bg-linear-to-r from-black/60 via-transparent to-transparent" />

      <div className="relative z-50 flex h-full flex-col justify-end gap-10 px-6 pb-12 lg:flex-row lg:items-end lg:justify-between lg:gap-16 lg:px-12 lg:pb-16">
        {/* ── wordmark, lower-left ── */}
        <div className="max-w-xl">
          <p className="animate-fade-up flex items-center gap-3 text-xs tracking-[0.38em] text-accent uppercase [animation-delay:200ms] sm:text-sm sm:tracking-[0.42em]">
            <span className="h-px w-8 bg-accent" aria-hidden="true" />
            {eyebrow}
          </p>
          <h1 className="animate-fade-up mt-4 font-display text-5xl leading-[0.9] font-black tracking-[-0.015em] uppercase [animation-delay:350ms] sm:text-7xl lg:text-8xl">
            {siteName}
          </h1>
          <p className="animate-fade-up mt-5 max-w-md text-sm leading-relaxed text-fg-muted [animation-delay:500ms]">
            {tagline}
          </p>

          <div className="animate-fade-up mt-8 flex flex-wrap items-center gap-4 [animation-delay:650ms]">
            <Link href="#work" className={CTA_CLASS}>
              View Photos
            </Link>
            <Link href="/contact" className={CTA_CLASS}>
              Get in Touch
            </Link>
          </div>
        </div>

        {/* ── gallery cards, lower-right ── */}
        <div className="hidden shrink-0 flex-col items-center gap-5 sm:flex">
          <div className="flex items-end gap-3">
            {categories.map((category, i) => (
              <CategoryTile
                key={category.id}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                category={category}
                active={i === active}
                // Hidden while its copy is in flight, so the card does not sit in the row at
                // the same moment an identical one is sailing away from it.
                hidden={flight?.index === i}
                onSelect={() => go(i)}
              />
            ))}
          </div>

          <div className="flex w-full items-center gap-5">
            {total > 1 && (
              <div className="flex gap-2.5">
                <Arrow label="Previous gallery" onClick={() => go(active - 1)} glyph="‹" />
                <Arrow label="Next gallery" onClick={() => go(active + 1)} glyph="›" />
              </div>
            )}

            {/* Progress through the set, as a line rather than a number — it reads at a glance
                and carries the eye along the row of cards it sits beneath. */}
            <div className="relative h-px flex-1 bg-fg/25" aria-hidden="true">
              <div
                className="absolute inset-y-0 left-0 bg-accent transition-all duration-700 ease-out"
                style={{ width: `${((active + 1) / total) * 100}%` }}
              />
            </div>

            <p className="font-display text-3xl leading-none font-light text-fg/90 tabular-nums lg:text-4xl">
              {String(active + 1).padStart(2, "0")}
            </p>
          </div>
        </div>

        {/* Phones: plain dots, since a row of photo cards has nowhere to go at that width. */}
        {total > 1 && (
          <div className="flex gap-2.5 sm:hidden">
            {categories.map((category, i) => (
              <button
                key={category.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show ${category.name}`}
                aria-current={i === active}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === active ? "w-7 bg-accent" : "w-1.5 bg-fg/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Announces the change to a screen reader without the visual churn of a live region
          wrapped around the cards themselves. */}
      <p className="sr-only" aria-live="polite">
        {current.name}, gallery {active + 1} of {total}
      </p>
    </section>
  );
}

/**
 * One gallery's card.
 *
 * <p>Two steps on purpose: the first click brings a gallery to the front, and only the card
 * already showing offers to open it. Going straight to the gallery would mean a visitor could
 * never look at a photograph without leaving the page — the point of the row is to browse.
 *
 * <p>The active card stands taller than its neighbours, which is what makes the row read as a
 * set with one of them chosen rather than several unrelated thumbnails.
 */
function CategoryTile({
  ref,
  category,
  active,
  hidden,
  onSelect,
}: {
  ref: (el: HTMLElement | null) => void;
  category: Category;
  active: boolean;
  hidden: boolean;
  onSelect: () => void;
}) {
  const count = category.mediaCount;

  const inner = (
    <>
      {category.coverImageUrl && (
        <Image
          src={category.coverImageUrl}
          alt=""
          fill
          sizes="(max-width: 1024px) 140px, 180px"
          unoptimized
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <span className="absolute inset-0 bg-linear-to-t from-black/90 via-black/25 to-transparent" />

      <span className="absolute inset-x-0 bottom-0 p-3 text-left lg:p-4">
        <span className="block text-[9px] tracking-[0.18em] text-fg-muted uppercase">
          {count} {count === 1 ? "piece" : "pieces"}
        </span>
        <span className="mt-1 block font-display text-sm leading-tight font-bold tracking-[0.04em] text-fg uppercase lg:text-base">
          {category.name}
        </span>
        {active && (
          <span className="mt-1.5 block text-[9px] tracking-[0.16em] text-accent uppercase">
            View gallery →
          </span>
        )}
      </span>
    </>
  );

  const frame = `group relative block shrink-0 overflow-hidden rounded-2xl transition-all duration-500 ${
    hidden ? "opacity-0" : ""
  } ${
    active
      ? "w-36 ring-2 ring-accent shadow-[0_20px_50px_-15px_rgba(0,0,0,0.8)] lg:w-44"
      : "w-32 opacity-75 brightness-75 hover:opacity-100 hover:brightness-95 lg:w-38"
  }`;

  // Portrait, and taller when active — the ratio is what makes these read as cards rather than
  // cropped stills, and it matches how a gallery plate is usually presented.
  const style = { aspectRatio: active ? "5 / 7" : "5 / 6.4" };

  if (active) {
    return (
      <Link ref={ref} href={`/work/${category.slug}`} className={frame} style={style}>
        {inner}
      </Link>
    );
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={frame}
      style={style}
      aria-label={`Show ${category.name}`}
    >
      {inner}
    </button>
  );
}

function Arrow({
  label,
  onClick,
  glyph,
}: {
  label: string;
  onClick: () => void;
  glyph: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-fg/30 text-lg leading-none text-fg-muted backdrop-blur-sm transition-all duration-300 hover:border-accent hover:bg-accent/20 hover:text-accent"
    >
      {glyph}
    </button>
  );
}
