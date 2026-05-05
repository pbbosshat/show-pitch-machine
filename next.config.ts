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
    // Externalize server-only packages from ALL webpack bundles (server + browser).
    // serverExternalPackages only covers Server Component compilation; webpack still
    // traverses instrumentation.ts dynamic imports and lib/*.ts files directly.
    // These packages either contain native .node binaries or import bare Node built-ins
    // (e.g. require('fs'), require('https')) that fail in the browser bundle.
    const serverOnlyPkgs = [
      // Native binary packages
      'fastembed', '@lancedb/lancedb', 'onnxruntime-node', '@anush008/tokenizers', 'better-sqlite3',
      // Server-only packages that use bare Node built-in names (fs, http, https, net…)
      'puppeteer', 'puppeteer-core', 'puppeteer-extra', 'puppeteer-extra-plugin-stealth',
      'googleapis', 'google-auth-library', 'gaxios', 'gcp-metadata', 'google-p12-pem', 'gtoken',
      '@modelcontextprotocol/sdk',
      'node-cron',
      'csv-parse',
      'cheerio', 'htmlparser2', 'domhandler', 'css-select',
      'html-to-text',
      'nodemailer',
      'apache-arrow',
      '@anthropic-ai/sdk',
      'groq-sdk',
      'openai',
    ];

    config.externals = [
      ...(Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)),
      ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
        if (request?.startsWith('node:')) {
          return callback(null, `commonjs ${request}`);
        }
        if (serverOnlyPkgs.some(pkg => request === pkg || request?.startsWith(`${pkg}/`))) {
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
