import Image from "next/image";
import { blurProps, cloudinaryThumb } from "@/lib/format";

/**
 * A shorter, still-image cousin of the homepage {@link Hero} — opens a listing page (Work,
 * Film) with a photograph instead of plain black.
 *
 * <p>Deliberately not full-screen: a visitor has usually just seen the full-height homepage
 * hero one click ago, and repeating that exact treatment on the very next page would feel like
 * a rerun rather than a new page. ~45% of the viewport reads as a title card, not a second
 * arrival.
 *
 * <p>Renders unconditionally once given a URL — callers decide whether to show it. See
 * `/work` and `/videos`, which fall back to a plain text header when the photographer hasn't
 * set a banner image, so an unset field never leaves a half-built layout.
 */
export function PageBanner({
  eyebrow,
  heading,
  imageUrl,
}: {
  eyebrow: string;
  heading: string;
  imageUrl: string;
}) {
  return (
    <section className="relative flex h-[46vh] min-h-96 w-full items-center justify-center overflow-hidden">
      <Image
        src={cloudinaryThumb(imageUrl, 2200)}
        alt=""
        fill
        priority
        sizes="100vw"
        {...blurProps(imageUrl)}
        className="object-cover"
      />

      {/* A single top-to-bottom wash is enough at this height — the full Hero's extra radial
          vignette exists to hold a much larger, more varied composition steady; here it would
          just be adding weight the shorter frame doesn't need. */}
      <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/35 to-black/80" />

      <div className="relative z-10 px-6 text-center">
        <p className="animate-fade-up text-[10px] tracking-[0.32em] text-accent uppercase">
          {eyebrow}
        </p>
        <h1 className="animate-fade-up mt-3 font-display text-5xl tracking-[0.06em] uppercase [animation-delay:120ms] sm:text-6xl">
          {heading}
        </h1>
      </div>
    </section>
  );
}
