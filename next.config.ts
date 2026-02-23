import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
        ],
      },
    ];
  },
};

export default nextConfig;
