import type { NextConfig } from "next";

function getHostname(value?: string) {
  if (!value) return null;
  try {
    return new URL(value).hostname;
  } catch {
    return null;
  }
}

const supabaseHostnames = Array.from(
  new Set(
    [
      getHostname(process.env.NEXT_PUBLIC_SUPABASE_URL),
      getHostname(process.env.SUPABASE_URL),
    ].filter((hostname): hostname is string => Boolean(hostname)),
  ),
);

const nextConfig: NextConfig = {
  images: {
    minimumCacheTTL: 2678400,
    formats: ["image/webp"],
    qualities: [75],
    // Reuse existing widths so tightening the allowlist does not create new sizes.
    deviceSizes: [640, 768, 1280, 1536],
    imageSizes: [48, 96, 256, 384],
    localPatterns: [
      {
        pathname: "/sports/**",
      },
      {
        pathname: "/icons/**",
      },
      {
        pathname: "/flags/**",
      },
      {
        pathname: "/images/**",
      },
    ],
    remotePatterns: [
      ...supabaseHostnames.map((hostname) => ({
        protocol: "https" as const,
        hostname,
        pathname: "/storage/v1/object/public/**",
      })),
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "profile.line-scdn.net",
      },
      {
        protocol: "https",
        hostname: "platform-lookaside.fbsbx.com",
      },
      {
        protocol: "https",
        hostname: "secure.meetupstatic.com",
      },
    ],
  },
};

export default nextConfig;
