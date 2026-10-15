import Link from "next/link";

/**
 * Root-level 404. Lives outside the (site) group, so it renders without the header/footer
 * chrome — a dead-end page shouldn't need the API to be reachable in order to display.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-7xl leading-none font-light tracking-[0.1em] text-fg-subtle sm:text-8xl">
        404
      </p>
      <h1 className="mt-8 font-display text-2xl tracking-[0.12em] uppercase sm:text-3xl">
        Nothing here
      </h1>
      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-fg-muted">
        This page may have moved, or the gallery you&apos;re looking for isn&apos;t published
        yet.
      </p>

      <div className="mt-12 flex flex-col gap-4 sm:flex-row">
        <Link
          href="/"
          className="border border-fg/30 px-9 py-3.5 text-[11px] tracking-[0.24em] uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
        >
          Home
        </Link>
        <Link
          href="/work"
          className="border border-transparent px-9 py-3.5 text-[11px] tracking-[0.24em] text-fg-muted uppercase transition-colors hover:text-accent"
        >
          Browse Work
        </Link>
      </div>
    </div>
  );
}
