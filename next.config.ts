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
};

export default nextConfig;
