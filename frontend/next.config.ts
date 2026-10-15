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
    // next/image refuses remote hosts unless they're allow-listed, which is what keeps the
    // optimizer from being used as an open proxy for arbitrary URLs.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
    // Cloudinary already serves AVIF/WebP via f_auto, but this covers images requested
    // without a transformation.
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
