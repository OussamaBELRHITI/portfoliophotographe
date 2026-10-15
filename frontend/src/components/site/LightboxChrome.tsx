"use client";

import type { ReactNode } from "react";

/**
 * Fixed full-screen backdrop shared by the photo and film lightboxes: the vignette (same
 * technique as the Hero, so a flat black backdrop doesn't read as an empty void), the fade-in,
 * and click-to-close. Kept as one component so both viewers evolve together rather than drift.
 */
export function LightboxBackdrop({
  onClose,
  ariaLabel,
  children,
}: {
  onClose: () => void;
  ariaLabel?: string;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-100 flex items-center justify-center bg-ink/98 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,20,22,0.55)_0%,rgba(5,5,5,0.4)_55%,rgba(0,0,0,0.75)_100%)]" />
      {children}
    </div>
  );
}

/** Counter and close button, sharing a row clear of the item itself. */
export function LightboxTopChrome({
  index,
  total,
  onClose,
}: {
  index: number;
  total: number;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="text-[10px] tracking-[0.28em] text-fg-subtle tabular-nums">
        {String(index + 1).padStart(2, "0")}
        <span className="mx-2 text-line-bright">·</span>
        {String(total).padStart(2, "0")}
      </p>
      <CloseButton onClick={onClose} />
    </div>
  );
}

export function NavButton({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous" : "Next"}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`absolute top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-fg/25 text-lg leading-none text-fg-muted backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-accent hover:bg-accent/20 hover:text-accent ${
        side === "left" ? "left-3 sm:left-8" : "right-3 sm:right-8"
      }`}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="absolute top-6 right-6 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-fg/40 bg-ink/60 text-xl leading-none text-fg backdrop-blur-md transition-all duration-300 hover:scale-105 hover:border-accent hover:bg-accent/20 hover:text-accent"
    >
      ×
    </button>
  );
}
