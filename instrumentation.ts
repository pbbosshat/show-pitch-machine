// Next.js instrumentation hook — runs once when the server process starts.
// Used here to boot the MCP HTTP server on port 3001 alongside the Next.js app.
// Claude Code connects to localhost:3001/mcp to query all Pitch Machine data.

export async function register() {
  // Only run in the Node.js runtime (not edge), and only on the server
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  // Run pending SQL migrations before any request is served
  const { initDb } = await import('./lib/db');
  initDb();

  const { startMcpServer } = await import('./lib/mcp');
  await startMcpServer();

  const { initScheduler } = await import('./lib/scheduler');
  initScheduler();
}
