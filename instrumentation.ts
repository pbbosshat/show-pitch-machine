// Next.js instrumentation hook — runs once when the server process starts.
// Used here to boot the MCP HTTP server on port 3001 alongside the Next.js app.
// Claude Code connects to localhost:3001/mcp to query all Pitch Machine data.

export async function register() {
  // Only run in the Node.js runtime (not edge), and only on the server
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // webpackIgnore: true prevents webpack from analyzing these imports at build time.
  // Without it, webpack traverses puppeteer/googleapis/lancedb into Node built-ins
  // (fs, http, net) that fail in the browser bundle. These only ever run server-side.
  const { initDb } = await import(/* webpackIgnore: true */ './lib/db');
  initDb();

  const { startMcpServer } = await import(/* webpackIgnore: true */ './lib/mcp');
  await startMcpServer();

  const { initScheduler } = await import(/* webpackIgnore: true */ './lib/scheduler');
  initScheduler();
}
