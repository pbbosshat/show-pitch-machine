// Quick test of claudeSpawn approach
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const home = process.env.USERPROFILE || process.env.HOME || '';
const creds = JSON.parse(fs.readFileSync(path.join(home, '.claude', '.credentials.json'), 'utf-8'));
const token = creds.claudeAiOauth.accessToken;
const cliPath = path.join(process.env.APPDATA || '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'cli.js');

console.log('CLI path:', cliPath);
console.log('CLI exists:', fs.existsSync(cliPath));
console.log('Token starts:', token.slice(0, 20) + '...');

const prompt = [
  'Match each email to a show deck, or null if no match.',
  '',
  'DECKS:',
  'D1: "Haunted World" (Paranormal)',
  'D2: "Home Game" (Lifestyle)',
  'D3: "Heidi Montag: Rookie PI" (Reality)',
  '',
  'EMAILS:',
  '[1] 2024-02-10 | producer@discovery.com | Haunted World Season 2 thoughts',
  '[2] 2024-03-05 | sarah@hgtv.com | Re: Home Game follow up',
  '[3] 2024-01-15 | cassie@fox.com | General pitch meeting notes',
  '',
  'JSON array, exactly 3 items: [{"d":"D1","c":"high"},{"d":null,"c":"low"},...]',
  'd = deck number or null. c = high|medium|low.',
].join('\n');

const env = { ...process.env, ANTHROPIC_API_KEY: token };
const proc = spawn(process.execPath, [
  cliPath, '--bare', '-p', prompt,
  '--model', 'claude-haiku-4-5-20251001',
  '--output-format', 'json',
  '--system-prompt', 'You match TV pitch emails to show titles. Reply ONLY with a JSON array — no markdown.',
], { stdio: ['ignore', 'pipe', 'pipe'], env });

let out = '';
let err = '';
proc.stdout.on('data', d => { out += d; });
proc.stderr.on('data', d => { err += d; });
proc.on('close', code => {
  console.log('\nExit code:', code);
  if (err) console.log('Stderr:', err.slice(0, 200));
  try {
    const json = JSON.parse(out);
    console.log('is_error:', json.is_error);
    console.log('Result text:', json.result);
    const parsed = JSON.parse(json.result.trim().replace(/^```json?\s*/i, '').replace(/\s*```$/i, ''));
    console.log('Parsed matches:', JSON.stringify(parsed));
  } catch(e) {
    console.log('Parse error:', e.message);
    console.log('Raw out:', out.slice(0, 500));
  }
});
proc.on('error', e => console.error('Spawn error:', e.message));
