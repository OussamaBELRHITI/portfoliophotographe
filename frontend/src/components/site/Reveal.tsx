"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Fades and lifts its children into view the first time they approach the viewport.
 *
 * <p>Uses IntersectionObserver rather than a scroll listener: the browser does the work off the
 * main thread, so a long gallery doesn't fire hundreds of handlers per scroll frame. Each
 * element disconnects its observer once revealed — nothing keeps observing after it has done
 * its one job.
 *
 * <p>`rootMargin` starts the animation slightly before the element is actually on screen, so it
 * finishes as the reader arrives rather than beginning under their nose.
 */
export function Reveal({
  children,
  delay = 0,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  /** Milliseconds. Stagger siblings by passing index * 60 or so. */
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Without IntersectionObserver the element would stay at opacity 0 forever, so show it
    // immediately. Scheduled on the next frame rather than called straight from the effect
    // body, which would be a synchronous cascading render.
    if (typeof IntersectionObserver === "undefined") {
      const raf = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(raf);
    }

    // The reduced-motion case is handled entirely in CSS: globals.css collapses every
    // transition to ~0ms under `prefers-reduced-motion`, so these elements appear instantly
    // without needing a separate branch here.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -80px 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      // @ts-expect-error — ref type varies with the chosen tag, all are HTMLElements
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-900 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}
