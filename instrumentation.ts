// Next.js instrumentation hook — runs once when the server process starts.
// Used here to boot the MCP HTTP server on port 3001 alongside the Next.js app.
// Claude Code connects to localhost:3001/mcp to query all Pitch Machine data.
//
// Scraping is NOT done here — Bang (10.0.0.208) runs the full scrape pipeline daily
// and pushes classified articles to /api/ingest/articles via INGEST_API_KEY.

export async function register() {
  // Only run in the Node.js runtime (not edge), and only on the server
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // initDb is async since the Postgres migration — must await so migrations finish
  // before the HTTP listener starts accepting requests.
  const { initDb } = await import('./lib/db');
  await initDb();

  const { startMcpServer } = await import('./lib/mcp');
  await startMcpServer();
}
