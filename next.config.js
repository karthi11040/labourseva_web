/** @type {import('next').NextConfig} */

// ---------------------------------------------------------------------------
// Security headers.
//
// CSP policy notes (live-safe tuning):
//  - Enforced only in production. Local dev skips it (HMR + cap widget on
//    http://127.0.0.1:3002 need a looser policy during development).
//  - script-src/style-src keep 'unsafe-inline' because the portal embeds
//    Google AdSense, Razorpay Checkout and inline Tailwind styles. Migrating
//    to a nonce-based strict CSP is the follow-up (see docs note at bottom).
//  - The high-value protections (frame-ancestors, object-src, base-uri,
//    form-action, upgrade-insecure-requests) are still fully enforced.
// ---------------------------------------------------------------------------
const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  // AdSense / Razorpay / Turnstile integration requires https: third parties.
  "script-src 'self' 'unsafe-inline' https:",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Content images include remote AdSense creatives and data: URIs.
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Razorpay + Turnstile + Cap widget (dev endpoint) + third-party beacons.
  "connect-src 'self' https: http://127.0.0.1:3002",
  "frame-src 'self' about: https:",
  "media-src 'self' data: https:",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  isProduction ? "upgrade-insecure-requests" : "",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  // "allow-popups" keeps Razorpay popup/iframe checkout working; still blocks
  // cross-origin window collisions.
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
];

if (isProduction) {
  securityHeaders.unshift({ key: "Content-Security-Policy", value: contentSecurityPolicy });
}

const nextConfig = {
  reactStrictMode: true,
  compress: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/user/documents",
        destination: "/user/applications",
        permanent: false,
      },
    ];
  },
};

/**
 * Follow-up hardening path (documented for the next release):
 *   1. Move to nonce-based strict CSP via proxy.ts (requires dynamic rendering
 *      on all pages — plan capacity first).
 *   2. Add a CSP report endpoint and run Content-Security-Policy-Report-Only
 *      for a week before switching the strict policy.
 */

module.exports = nextConfig;
