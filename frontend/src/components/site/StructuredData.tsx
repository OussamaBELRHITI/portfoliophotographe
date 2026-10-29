import type { Category, Media, SiteSettings } from "@/lib/types";
import { SETTINGS_FALLBACK } from "@/lib/types";
import { SITE_URL } from "@/lib/site";

/**
 * JSON-LD structured data.
 *
 * Tells search engines this is a photography business rather than a generic page, which is
 * what makes rich results (name, location, contact, gallery images) possible. Rendered as a
 * plain script tag — the schema.org vocabulary is designed to be read by crawlers, not users.
 */
export function StructuredData({
  settings,
  categories = [],
}: {
  settings: SiteSettings;
  categories?: Category[];
}) {
  const name = settings.siteName ?? SETTINGS_FALLBACK.siteName;

  const sameAs = [settings.instagramUrl].filter(Boolean);

  const data = {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    "@id": `${SITE_URL}#business`,
    name,
    description: settings.metaDescription ?? SETTINGS_FALLBACK.metaDescription,
    url: SITE_URL,
    // additionalType pins the vocabulary term for the trade, which the generic
    // ProfessionalService type alone doesn't convey.
    additionalType: "https://schema.org/Photograph",
    ...(settings.contactEmail && { email: settings.contactEmail }),
    ...(settings.contactPhone && { telephone: settings.contactPhone }),
    ...(settings.location && { areaServed: settings.location }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(settings.aboutPortraitUrl && { image: settings.aboutPortraitUrl }),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Photography services",
      itemListElement: categories.map((c, i) => ({
        "@type": "Offer",
        position: i + 1,
        itemOffered: { "@type": "Service", name: c.name, url: `${SITE_URL}/work/${c.slug}` },
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is data we generated, not user markup; the < escape guards
      // against a stray sequence closing the script tag early.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

/** Per-gallery structured data, so an individual gallery can surface as an image collection. */
export function GalleryStructuredData({
  category,
  media,
}: {
  category: Category;
  media: Media[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    name: category.name,
    ...(category.description && { description: category.description }),
    url: `${SITE_URL}/work/${category.slug}`,
    numberOfItems: media.length,
    associatedMedia: media.slice(0, 30).map((m) => ({
      "@type": "ImageObject",
      contentUrl: m.url,
      ...(m.title && { name: m.title }),
      ...(m.width && { width: m.width }),
      ...(m.height && { height: m.height }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}
