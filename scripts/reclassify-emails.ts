// Re-classifies emails in package_emails that were stored with a failed Groq classification.
// Looks for rows where grok_raw contains '"pitch_related":false' AND the original
// groq error pattern (no real classification happened). Useful after fixing the Groq URL bug.

import { query, run } from '../lib/db';
import { classifyEmail } from '../lib/groq';

interface EmailRow {
  id: string;
  subject: string;
  sender: string;
  received_at: number;
  grok_raw: string;
  gmail_thread_id: string;
}

async function reclassifyEmails(): Promise<void> {
  // Only reclassify rows where classification clearly failed (grok_raw is the FALLBACK value)
  const fallbackRaw = JSON.stringify({
    pitch_related: false,
    package_id: null,
    signal: 'unrelated',
    meeting_date: null,
    pass_reason_quoted: null,
    deal_terms_mentioned: null,
    confidence: 'low',
  });

  const rows = query<EmailRow>(
    `SELECT id, subject, sender, received_at, grok_raw, gmail_thread_id
     FROM package_emails
     WHERE grok_raw = ?`,
    [fallbackRaw]
  );

  console.log(`Found ${rows.length} emails to reclassify`);
  if (rows.length === 0) { process.exit(0); return; }

  const activePitches = query<{ id: string; name: string; buyerName: string }>(
    `SELECT p.id, p.name, COALESCE(bc.name, '') AS buyerName
     FROM packages p
     LEFT JOIN buyer_contacts bc ON bc.id = p.target_contact_id
     WHERE p.status != 'archived'`
  );

  let reclassified = 0;
  let pitchRelated = 0;

  for (const row of rows) {
    const classification = await classifyEmail({
      subject: row.subject,
      sender: row.sender,
      recipient: '',
      body: '',
      date: new Date(row.received_at).toISOString(),
      activePitches,
    });

    run(
      `UPDATE package_emails
          SET grok_signal = ?, grok_raw = ?, package_id = ?
        WHERE id = ?`,
      [classification.signal, JSON.stringify(classification), classification.package_id ?? null, row.id]
    );

    reclassified++;
    if (classification.pitch_related) pitchRelated++;

    if (reclassified % 10 === 0) {
      console.log(`  ${reclassified}/${rows.length} reclassified (${pitchRelated} pitch-related so far)`);
    }
  }

  console.log(`Done: ${reclassified} reclassified, ${pitchRelated} pitch-related`);
  process.exit(0);
}

reclassifyEmails().catch((e: unknown) => {
  console.error('Failed:', e instanceof Error ? e.message : e);
  process.exit(1);
});
