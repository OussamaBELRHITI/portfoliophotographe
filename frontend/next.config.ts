import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server bundle for the Docker image: `.next/standalone` carries server.js and
  // only the node_modules it actually imports, so the runtime image needs no `npm install`.
  output: "standalone",
  // Hide the floating "N" dev-tools button (development only). Compile and runtime errors
  // still show as an overlay.
  devIndicators: false,
  // Pin the workspace root. Without this Turbopack walks up looking for a lockfile and finds
  // an unrelated one in the home directory, then warns about which root it should use.
  turbopack: {
    root: __dirname,
  },
  images: {
    // No remotePatterns and no optimizer: uploaded files are already correctly-sized WebP,
    // produced in the browser before upload, and they are served from this same origin. Every
    // <Image> rendering one passes `unoptimized`, so Next has no host to allow-list and does
    // not re-encode a file that is already in its final form.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
