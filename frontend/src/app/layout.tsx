import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { publicApi } from "@/lib/api";
import { SETTINGS_FALLBACK } from "@/lib/types";
import "./globals.css";

// One plain, highly legible sans for everything — headings included. A decorative display
// face was tried and read as fussy next to the photography.
const sans = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Titles and descriptions come from the dashboard rather than being hardcoded, so renaming the
 * studio updates every tab title and share card without a code change.
 */
export async function generateMetadata(): Promise<Metadata> {
  let siteName = SETTINGS_FALLBACK.siteName;
  let description = SETTINGS_FALLBACK.metaDescription;

  try {
    const settings = await publicApi.settings();
    siteName = settings.siteName ?? siteName;
    description = settings.metaDescription ?? description;
  } catch {
    // defaults above
  }

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: `${siteName} — Photography & Film`,
      template: `%s — ${siteName}`,
    },
    description,
    openGraph: {
      type: "website",
      siteName,
      title: `${siteName} — Photography & Film`,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteName} — Photography & Film`,
      description,
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
