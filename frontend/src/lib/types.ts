/**
 * Mirrors the DTO records the Spring backend returns.
 * Keep these in sync with `com.portfolio.backend.dto`.
 */

export type MediaType = "IMAGE" | "VIDEO";

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  visible: boolean;
  displayOrder: number;
  mediaCount: number;
  coverImageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Media {
  id: number;
  title?: string | null;
  description?: string | null;
  url: string;
  publicId: string;
  type: MediaType;
  width?: number | null;
  height?: number | null;
  format?: string | null;
  bytes?: number | null;
  durationSeconds?: number | null;
  visible: boolean;
  featured: boolean;
  displayOrder: number;
  categoryId?: number | null;
  createdAt: string;
}

/** Editable site copy, managed from the dashboard rather than env vars. */
export interface SiteSettings {
  siteName?: string | null;
  heroEyebrow?: string | null;
  heroTagline?: string | null;
  aboutHeading?: string | null;
  aboutBody?: string | null;
  aboutPortraitUrl?: string | null;
  /** Cloudinary URL for the short image band above the /work gallery grid. Unset = plain text header. */
  workBannerUrl?: string | null;
  /** Same idea, for the /videos (Film) page. */
  videosBannerUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  whatsappUrl?: string | null;
  location?: string | null;
  metaDescription?: string | null;
}

/**
 * Fallbacks so the site never renders a blank where copy should be.
 *
 * Deliberately not typed as `Required<Pick<SiteSettings, …>>`: `Required` strips the `?` but
 * keeps the `| null` in each field's union, so every value would still be `string | null` and
 * `?? fallback` would not actually narrow to `string`.
 */
export const SETTINGS_FALLBACK = {
  siteName: "Studio",
  heroEyebrow: "Photography & Film",
  heroTagline: "Stories told in stills and motion.",
  aboutHeading: "About",
  metaDescription: "Photography and film portfolio.",
} satisfies Record<string, string>;

export interface LoginResponse {
  token: string;
  tokenType: string;
  expiresInMs: number;
  username: string;
  role: string;
}

export interface CloudinarySignature {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
  uploadUrl: string;
}

/** RFC 9457 ProblemDetail, as produced by GlobalExceptionHandler. */
export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  timestamp?: string;
  errors?: Record<string, string>;
}
