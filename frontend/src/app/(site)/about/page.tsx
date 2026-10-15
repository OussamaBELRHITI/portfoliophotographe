import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/site/Reveal";
import { publicApi } from "@/lib/api";
import { blurProps, cloudinaryThumb, isCloudinary } from "@/lib/format";
import type { SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await publicApi.settings();
    return {
      title: settings.aboutHeading ?? SETTINGS_FALLBACK.aboutHeading,
      description: settings.aboutBody?.slice(0, 160) ?? undefined,
    };
  } catch {
    return { title: SETTINGS_FALLBACK.aboutHeading };
  }
}

export default async function AboutPage() {
  let settings: SiteSettings = {};
  try {
    settings = await publicApi.settings();
  } catch {
    // renders with fallbacks
  }

  const heading = settings.aboutHeading ?? SETTINGS_FALLBACK.aboutHeading;
  const portrait = settings.aboutPortraitUrl;

  // Blank lines become paragraphs — lets the photographer write multi-paragraph copy in a
  // plain textarea without needing a rich-text editor.
  const paragraphs = (settings.aboutBody ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-350 px-6 pt-32 pb-24 lg:px-12 lg:pt-40">
      <Reveal className="mb-16">
        <p className="text-[10px] tracking-[0.32em] text-accent uppercase">
          {settings.siteName ?? SETTINGS_FALLBACK.siteName}
        </p>
        <h1 className="mt-3 font-display text-5xl tracking-[0.06em] uppercase sm:text-6xl">
          {heading}
        </h1>
      </Reveal>

      <div className="grid gap-16 lg:grid-cols-[1fr_1.2fr] lg:gap-24">
        {portrait && (
          <Reveal>
            <div className="relative aspect-4/5 overflow-hidden bg-surface-raised">
              <Image
                src={cloudinaryThumb(portrait, 900)}
                alt={settings.siteName ?? "Portrait"}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                unoptimized={!isCloudinary(portrait)}
                {...blurProps(portrait)}
                className="object-cover"
              />
            </div>
          </Reveal>
        )}

        <Reveal delay={120} className={portrait ? "" : "lg:col-span-2 lg:max-w-3xl"}>
          {paragraphs.length > 0 ? (
            <div className="space-y-6">
              {paragraphs.map((p, i) => (
                <p
                  key={i}
                  // The opening paragraph gets a larger, lighter treatment — a standing
                  // editorial convention that gives the page somewhere to begin.
                  className={
                    i === 0
                      ? "text-xl leading-relaxed text-fg sm:text-2xl"
                      : "text-sm leading-[1.9] text-fg-muted"
                  }
                >
                  {p}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm leading-relaxed text-fg-subtle">
              This section is being written.
            </p>
          )}

          <div className="mt-12 flex flex-wrap gap-4 border-t border-line pt-10">
            <Link
              href="/contact"
              className="border border-fg/30 px-9 py-3.5 text-[11px] tracking-[0.24em] uppercase transition-all duration-300 hover:border-accent hover:bg-accent hover:text-ink"
            >
              Get in Touch
            </Link>
            <Link
              href="/work"
              className="border border-transparent px-9 py-3.5 text-[11px] tracking-[0.24em] text-fg-muted uppercase transition-colors hover:text-accent"
            >
              See the Work
            </Link>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
