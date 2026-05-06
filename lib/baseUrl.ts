// Railway injects RAILWAY_PUBLIC_DOMAIN automatically. Use it in production;
// fall back to localhost for local dev.
export function getBaseUrl(): string {
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return 'http://localhost:3000';
}
