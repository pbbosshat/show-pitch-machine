// SSH tunnel to Bang Machine (10.0.0.208) — opens a local port-forward so Puppeteer
// can connect to Bang's Chrome via localhost:19223.
// The tunnel also fires schtasks to ensure Chrome is running in debug mode before we try.
// Only active when BROWSER_MODE === 'bang-tunnel'.

import { spawn, exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

const BANG_HOST = process.env.BANG_HOST || '10.0.0.208';
const BANG_USER = process.env.BANG_USER || 'BubbaBang';
// Local port the tunnel binds — Puppeteer connects to this
const LOCAL_TUNNEL_PORT = process.env.LOCAL_TUNNEL_PORT || '19223';
// Remote Chrome CDP port on Bang Machine
const REMOTE_CDP_PORT = '9222';

let _tunnel: ReturnType<typeof spawn> | null = null;
let _isOpen = false;

// Start Chrome in debug mode on the remote machine before opening the port-forward
async function startRemoteChrome(): Promise<void> {
  try {
    await execAsync(
      `ssh -o ConnectTimeout=10 ${BANG_USER}@${BANG_HOST} "schtasks /run /tn ChromeDebugLaunch"`
    );
    // Give Chrome a moment to bind the CDP port before we forward it
    await new Promise((r) => setTimeout(r, 2500));
  } catch (err) {
    // Non-fatal — Chrome may already be running; proceed to open the tunnel
    console.warn('[tunnel] Could not start remote Chrome via schtasks:', err);
  }
}

// Wait until the forwarded CDP port responds to a basic HTTP request
async function waitForCdp(timeoutMs = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const { stdout } = await execAsync(
        `curl -sf --max-time 2 http://localhost:${LOCAL_TUNNEL_PORT}/json/version`
      );
      if (stdout.includes('"webSocketDebuggerUrl"') || stdout.includes('Browser')) return;
    } catch {
      // Not ready yet — keep polling
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw new Error(`[tunnel] CDP on localhost:${LOCAL_TUNNEL_PORT} did not become ready within ${timeoutMs}ms`);
}

// Open the SSH port-forward and wait for CDP to be reachable.
// Calling openTunnel() twice is safe — it's a no-op if already open.
export async function openTunnel(): Promise<void> {
  if (process.env.BROWSER_MODE !== 'bang-tunnel') return;
  if (_isOpen) return;

  await startRemoteChrome();

  // -N = no remote command, -L = port-forward, ServerAliveInterval keeps the socket open
  _tunnel = spawn('ssh', [
    '-N',
    '-o', 'ServerAliveInterval=30',
    '-o', 'ServerAliveCountMax=5',
    '-o', 'ExitOnForwardFailure=yes',
    '-o', 'StrictHostKeyChecking=no',
    '-L', `${LOCAL_TUNNEL_PORT}:localhost:${REMOTE_CDP_PORT}`,
    `${BANG_USER}@${BANG_HOST}`,
  ], {
    // Detach stdio so tunnel process doesn't inherit our stdout/stderr
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  _tunnel.stderr?.on('data', (d: Buffer) => {
    const msg = d.toString().trim();
    if (msg) console.log('[tunnel:ssh]', msg);
  });

  _tunnel.on('close', (code) => {
    console.log(`[tunnel] SSH process exited (code ${code})`);
    _isOpen = false;
    _tunnel = null;
  });

  // Wait for CDP to be live before returning to the caller
  await waitForCdp();
  _isOpen = true;
  console.log(`[tunnel] Open — localhost:${LOCAL_TUNNEL_PORT} → ${BANG_HOST}:${REMOTE_CDP_PORT}`);
}

// Kill the tunnel process — call this in process cleanup hooks
export function closeTunnel(): void {
  if (_tunnel) {
    _tunnel.kill('SIGTERM');
    _tunnel = null;
    _isOpen = false;
    console.log('[tunnel] Closed');
  }
}
