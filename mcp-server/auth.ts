// auth.ts — API key authentication helpers for the standalone MCP server.
//
// Two separate keys keep the trust scopes distinct:
//   MCP_API_KEY    — Sean's Claude Code config uses this to reach /mcp endpoints
//   INGEST_API_KEY — Bang (scraper machine) uses this to POST data to /ingest/*
//
// Both are checked as Bearer tokens in the Authorization header.
// Return true if valid, false if not (caller writes the 401 response).

import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Check that the request carries a valid MCP API key.
 * Sends a 401 and returns false if the key is missing or wrong.
 * Returns true if authorized.
 */
export function checkMcpAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const apiKey = process.env.MCP_API_KEY;

  // If no key is configured, reject all requests — no key means misconfigured service.
  // This forces explicit configuration rather than silently allowing open access.
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'MCP_API_KEY not configured on server' }));
    return false;
  }

  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (token !== apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized — invalid or missing Bearer token' }));
    return false;
  }

  return true;
}

/**
 * Check that the request carries a valid ingest API key.
 * Used on all /ingest/* endpoints that Bang POSTs to.
 * Sends a 401 and returns false if unauthorized.
 */
export function checkIngestAuth(req: IncomingMessage, res: ServerResponse): boolean {
  const apiKey = process.env.INGEST_API_KEY;

  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'INGEST_API_KEY not configured on server' }));
    return false;
  }

  const auth = req.headers['authorization'] ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (token !== apiKey) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Unauthorized — invalid or missing Bearer token' }));
    return false;
  }

  return true;
}

/**
 * Read and parse the JSON body of an incoming request.
 * Returns the parsed object or throws on invalid JSON / empty body.
 */
export async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}
