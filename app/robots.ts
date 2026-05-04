import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // GEO: Explicitly allow AI crawler bots so Perplexity, ChatGPT, and Claude
      // can index myentertainment.tv content and cite it accurately in AI answers.
      // These bots respect robots.txt — an explicit allow ensures no ambiguity.
      {
        userAgent: 'GPTBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      {
        userAgent: 'CCBot',
        allow: '/',
        disallow: ['/api/', '/_next/'],
      },
      // Default rule for all other crawlers — allow public pages, block internal tools
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/dashboard/',
          '/api/',
          '/market/',
          '/build/',
          '/_next/',
        ],
      },
    ],
    sitemap: 'https://www.myentertainment.tv/sitemap.xml',
    host: 'https://www.myentertainment.tv',
  };
}
