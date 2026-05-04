import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mark server-only native modules as external so Next.js doesn't try to bundle them
  serverExternalPackages: [
    "@lancedb/lancedb",
    "fastembed",
    "puppeteer",
    "node-cron",
    "googleapis",
    "@modelcontextprotocol/sdk",
    "csv-parse",
  ],
  webpack: (config) => {
    // Teach webpack to resolve node: protocol built-ins (e.g. node:sqlite) as CommonJS externals.
    // Without this, server components that transitively import lib/db.ts fail at runtime because
    // webpack bundles them as URL-type externals which Node's CommonJS loader can't resolve.
    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (request?.startsWith('node:')) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      },
    ];
    return config;
  },
  // Allow HMR and dev resource fetching through the mye.local Caddy proxy
  allowedDevOrigins: ["mye.local"],
  // Don't advertise Next.js to crawlers and bots
  poweredByHeader: false,
};

export default nextConfig;
