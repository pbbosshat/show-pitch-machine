import { pollPipelineEmails } from '../lib/email-poller';

console.log('Starting full backfill poll (no date filter — fetches all history)...');
pollPipelineEmails()
  .then(r => { console.log('Done:', JSON.stringify(r)); process.exit(0); })
  .catch((e: unknown) => { console.error('Failed:', e instanceof Error ? e.message : e); process.exit(1); });
