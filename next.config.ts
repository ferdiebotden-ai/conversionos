import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withSentryConfig } from "@sentry/nextjs";

const configDir = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: configDir,
  },
  transpilePackages: [
    '@norbot/conversionos-admin-core',
    '@norbot/conversionos-runtime',
    '@norbot/conversionos-visualizer',
  ],
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'ktpfyangnmpwufghgasx.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async redirects() {
    return [
      { source: '/services/kitchen', destination: '/services/kitchen-renovation', permanent: true },
      { source: '/services/bathroom', destination: '/services/bathroom-renovation', permanent: true },
      { source: '/services/basement', destination: '/services/basement-finishing', permanent: true },
      { source: '/services/outdoor', destination: '/services/outdoor-living', permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "0" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.elevenlabs.io",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https://ktpfyangnmpwufghgasx.supabase.co",
              "connect-src 'self' https://*.supabase.co wss://*.elevenlabs.io https://*.elevenlabs.io https://*.sentry.io",
              "media-src 'self' blob:",
              "worker-src 'self' blob: data:",
              "font-src 'self' data: https://fonts.gstatic.com",
              "frame-src 'self' https://elevenlabs.io",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

// Only apply Sentry wrapper when DSN is configured
const sentryAuthToken = process.env['SENTRY_AUTH_TOKEN'];
const finalConfig = sentryAuthToken
  ? withSentryConfig(nextConfig, {
      org: process.env['SENTRY_ORG'] ?? '',
      project: process.env['SENTRY_PROJECT'] ?? '',
      authToken: sentryAuthToken,
      silent: false,
      widenClientFileUpload: true,
      sourcemaps: {
        deleteSourcemapsAfterUpload: true,
      },
      telemetry: false,
    })
  : nextConfig;

export default finalConfig;
