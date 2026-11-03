import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  // Only meaningful over HTTPS; browsers ignore it on plain HTTP.
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["yaml"],
  poweredByHeader: false,
  // Challenge definitions are read from disk at request time. Serverless
  // bundles only include files they can trace from imports, so ship these.
  outputFileTracingIncludes: { "/**": ["./challenges/**"] },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};
export default nextConfig;
