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
    // Externalize native binary packages in ALL webpack bundles (server + browser).
    // serverExternalPackages only helps for Server Component compilation, but lib/*.ts
    // files (embed.ts, vectors.ts) are traversed directly by webpack and their
    // transitive .node binaries trigger nextErrorBrowserBinaryLoader at build time.
    const nativePkgs = ['fastembed', '@lancedb/lancedb', 'onnxruntime-node', '@anush008/tokenizers', 'better-sqlite3'];

    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (request?.startsWith('node:')) {
          return callback(null, `commonjs ${request}`);
        }
        if (nativePkgs.some(pkg => request === pkg || request?.startsWith(`${pkg}/`))) {
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
