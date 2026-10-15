import { ImageResponse } from "next/og";
import { connection } from "next/server";
import { publicApi } from "@/lib/api";
import { SETTINGS_FALLBACK } from "@/lib/types";

export const alt = "Photography & Film portfolio";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card shown when the site is shared on social media or in a messaging app.
 *
 * Generated at request time from the live settings, so changing the studio name in the
 * dashboard updates the share card too — no image to re-export by hand.
 *
 * Rendered by Satori, which supports a deliberately small subset of CSS: flexbox and absolute
 * positioning only, no grid, and every element needs an explicit `display`.
 */
export default async function OpengraphImage() {
  // Request time, not build time — see (site)/layout.tsx.
  await connection();

  let siteName = SETTINGS_FALLBACK.siteName;
  let eyebrow = SETTINGS_FALLBACK.heroEyebrow;

  try {
    const settings = await publicApi.settings();
    siteName = settings.siteName ?? siteName;
    eyebrow = settings.heroEyebrow ?? eyebrow;
  } catch {
    // fall back to the defaults above
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          // Solid fill, not a radial-gradient: Satori rasterises gradients internally and
          // its radial output fails resvg with "unsupported image format". A linear-gradient
          // overlay below gives depth without tripping that path.
          backgroundColor: "#050505",
          color: "#f2f2f0",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage: "linear-gradient(160deg, #16161a 0%, #050505 55%)",
          }}
        />
        {/* Uppercase applied in JS rather than via textTransform, which Satori ignores. */}
        <div
          style={{
            position: "relative",
            display: "flex",
            fontSize: 22,
            letterSpacing: 14,
            color: "#c8a882",
          }}
        >
          {eyebrow.toUpperCase()}
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            marginTop: 34,
            fontSize: 104,
            letterSpacing: 8,
          }}
        >
          {siteName.toUpperCase()}
        </div>

        <div
          style={{
            position: "relative",
            display: "flex",
            marginTop: 44,
            width: 120,
            height: 2,
            backgroundColor: "#c8a882",
          }}
        />
      </div>
    ),
    size,
  );
}
