"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Open/close/navigate state for a full-screen item viewer — shared by the photo gallery and
 * film lightboxes so the two stay behaviourally identical (same keyboard shortcuts, same
 * wraparound, same scroll lock) without copying the logic twice.
 */
export function useLightbox(length: number) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i + 1) % length)),
    [length],
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? null : (i - 1 + length) % length)),
    [length],
  );

  // Keyboard control while open, and a scroll lock so the page behind it doesn't move.
  useEffect(() => {
    if (openIndex === null) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openIndex, close, next, prev]);

  return { openIndex, setOpenIndex, close, next, prev };
}
