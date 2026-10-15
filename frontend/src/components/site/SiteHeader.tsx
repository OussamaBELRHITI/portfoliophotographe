"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Category, SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";

const LINKS = [
  { href: "/work", label: "Photos" },
  { href: "/videos", label: "Film" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Minimal fixed nav. Transparent over the hero, then picks up a background once scrolled so
 * the links stay readable against bright photography.
 */
export function SiteHeader({
  categories,
  settings,
}: {
  categories: Category[];
  settings: SiteSettings;
}) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    // Sync the initial value on the next frame rather than synchronously in the effect body —
    // this still catches a page loaded already scrolled (a refresh mid-page, or a #anchor).
    const raf = requestAnimationFrame(onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Close the drawer on navigation. Adjusting state during render is React's documented
  // alternative to an effect here: it happens before paint, so the drawer never flashes open
  // on the new route.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setMenuOpen(false);
  }

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-ink/85 backdrop-blur-md border-b border-line"
            : "bg-linear-to-b from-black/70 via-black/30 to-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-400 items-center justify-between px-6 py-5 lg:px-12">
          <Link
            href="/"
            className="font-display text-xl tracking-[0.2em] uppercase transition-colors hover:text-accent"
          >
            {siteName}
          </Link>

          <div className="hidden items-center gap-10 md:flex">
            {LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);

              // "Work" and "Film" both get a dropdown of every category, so a visitor can jump
              // straight into a gallery — or a category's films — from anywhere on the site
              // instead of landing on the index and scrolling to find it. Categories are shared
              // between photos and videos, so both dropdowns list the same set.
              if ((link.href === "/work" || link.href === "/videos") && categories.length > 0) {
                return (
                  <CategoryDropdownNavItem
                    key={link.href}
                    href={link.href}
                    label={link.label}
                    active={active}
                    categories={categories}
                  />
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-xs font-medium uppercase tracking-[0.22em] transition-colors ${
                    active ? "text-accent-bright" : "text-fg/90 hover:text-fg"
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute -bottom-1.5 left-0 h-px w-full bg-accent" />
                  )}
                </Link>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-9 w-9 flex-col items-center justify-center gap-1.5 md:hidden"
          >
            <span
              className={`h-px w-6 bg-fg transition-transform duration-300 ${
                menuOpen ? "translate-y-[3.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-px w-6 bg-fg transition-transform duration-300 ${
                menuOpen ? "translate-y-[-3.5px] -rotate-45" : ""
              }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile drawer — also lists categories, which is where the sidebar menu lives on small screens. */}
      <div
        className={`fixed inset-0 z-40 bg-ink transition-opacity duration-300 md:hidden ${
          menuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex h-full flex-col justify-center gap-8 px-8">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-4xl tracking-wide text-fg transition-colors hover:text-accent"
            >
              {link.label}
            </Link>
          ))}

          {categories.length > 0 && (
            <div className="mt-4 border-t border-line pt-6">
              <p className="mb-4 text-[10px] uppercase tracking-[0.28em] text-fg-subtle">
                Galleries
              </p>
              <div className="flex flex-col gap-3">
                {categories.map((c) => (
                  <Link
                    key={c.id}
                    href={`/work/${c.slug}`}
                    className="text-sm uppercase tracking-[0.18em] text-fg-muted transition-colors hover:text-accent"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * A nav item with a dropdown listing every category — used for both "Work" (photo galleries at
 * /work/{slug}) and "Film" (the same categories' videos at /videos/{slug}).
 *
 * Hover-driven via `group`/`focus-within` rather than JS-managed open state — no click handler,
 * no outside-click listener, nothing to get out of sync. Visibility toggles through opacity and
 * pointer-events only (never `hidden`/`invisible`), so the links stay in the tab order: a
 * keyboard user tabbing from the trigger lands on the first category link, which triggers
 * `focus-within` and reveals the panel exactly as a mouse hover would.
 *
 * The panel sits flush against the trigger (`top-full`, no gap) so the pointer can travel
 * straight down from the link into the menu without ever leaving a hoverable element.
 *
 * Clicking the trigger itself still navigates to the index immediately — the dropdown is a
 * shortcut, not a replacement for the full grid.
 */
function CategoryDropdownNavItem({
  href,
  label,
  active,
  categories,
}: {
  href: string;
  label: string;
  active: boolean;
  categories: Category[];
}) {
  return (
    <div className="group relative">
      <Link
        href={href}
        className={`relative flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.22em] transition-colors ${
          active ? "text-accent-bright" : "text-fg/90 hover:text-fg"
        }`}
      >
        {label}
        <svg
          width="8"
          height="8"
          viewBox="0 0 8 8"
          fill="none"
          aria-hidden="true"
          className="mt-px transition-transform duration-300 group-hover:rotate-180 group-focus-within:rotate-180"
        >
          <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1" />
        </svg>
        {active && <span className="absolute -bottom-1.5 left-0 h-px w-full bg-accent" />}
      </Link>

      <div className="absolute top-full left-0 w-56 pt-4 opacity-0 pointer-events-none transition-opacity duration-200 group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
        <div className="border border-line bg-ink/95 py-2 backdrop-blur-md">
          {categories.map((c) => (
            <Link
              key={c.id}
              href={`${href}/${c.slug}`}
              className="block px-5 py-2.5 text-xs tracking-[0.16em] text-fg-muted uppercase transition-colors hover:bg-surface-raised hover:text-accent"
            >
              {c.name}
            </Link>
          ))}
          <div className="mx-5 my-1.5 border-t border-line" />
          <Link
            href={href}
            className="block px-5 py-2.5 text-[11px] tracking-[0.16em] text-fg-subtle uppercase transition-colors hover:bg-surface-raised hover:text-accent"
          >
            All {label} →
          </Link>
        </div>
      </div>
    </div>
  );
}
