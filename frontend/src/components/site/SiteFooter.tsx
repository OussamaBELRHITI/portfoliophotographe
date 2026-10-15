import Link from "next/link";
import type { Category, SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";

export function SiteFooter({
  categories,
  settings,
}: {
  categories: Category[];
  settings: SiteSettings;
}) {
  const siteName = settings.siteName ?? SETTINGS_FALLBACK.siteName;
  const email = settings.contactEmail;

  return (
    <footer className="mt-auto border-t border-line bg-surface">
      <div className="mx-auto max-w-400 px-6 py-16 lg:px-12">
        <div className="grid gap-12 md:grid-cols-3">
          <div>
            <p className="font-display text-2xl tracking-[0.18em] uppercase">{siteName}</p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-fg-muted">
              {settings.heroTagline ?? SETTINGS_FALLBACK.heroTagline}
            </p>
            {settings.location && (
              <p className="mt-4 text-xs tracking-[0.14em] text-fg-subtle uppercase">
                {settings.location}
              </p>
            )}
          </div>

          <div>
            <p className="mb-4 text-[10px] tracking-[0.28em] text-fg-subtle uppercase">
              Galleries
            </p>
            <ul className="space-y-2">
              {categories.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/work/${c.slug}`}
                    className="text-sm text-fg-muted transition-colors hover:text-accent"
                  >
                    {c.name}
                  </Link>
                </li>
              ))}
              {categories.length === 0 && (
                <li className="text-sm text-fg-subtle">Coming soon</li>
              )}
            </ul>
          </div>

          <div>
            <p className="mb-4 text-[10px] tracking-[0.28em] text-fg-subtle uppercase">
              Contact
            </p>
            <ul className="space-y-2 text-sm">
              {email && (
                <li>
                  <a
                    href={`mailto:${email}`}
                    className="text-fg-muted transition-colors hover:text-accent"
                  >
                    {email}
                  </a>
                </li>
              )}
              {settings.instagramUrl && (
                <li>
                  <a
                    href={settings.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg-muted transition-colors hover:text-accent"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {settings.whatsappUrl && (
                <li>
                  <a
                    href={settings.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-fg-muted transition-colors hover:text-accent"
                  >
                    WhatsApp
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-line pt-6 text-xs text-fg-subtle sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteName}. All rights reserved.
          </p>
          <Link href="/admin" className="transition-colors hover:text-fg-muted">
            Admin
          </Link>
        </div>
      </div>
    </footer>
  );
}
