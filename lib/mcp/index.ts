// MCP module entry point — re-exports the server lifecycle functions.
// Import from here rather than from server.ts directly so the import path
// stays stable if the server implementation is refactored.

export { startMcpServer, stopMcpServer } from './server';
