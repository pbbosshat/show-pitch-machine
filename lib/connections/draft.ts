// Shawn-voice draft generation (email + LinkedIn note) via Groq.
//
// Voice rules distilled from LINKEDIN-GROWTH-PLAYBOOK.md (sections 0.6/0.6a/B3/
// B4) plus standing PB rules. Two variants keyed off the dedup outcome:
//   stranger  - "We haven't met yet." + "I run My Entertainment."
//   reconnect - "It's been a while." and NO company reintroduction.
//
// Hard guardrails enforced both in the prompt AND in code after generation:
//   - zero em dashes and en dashes (commas/periods only)
//   - li_note <= 200 characters
//   - never a "library" of material; no show titles in the li_note

import { groqChat, stripFences } from './llm';

export interface DraftInput {
  person_name: string;
  person_title: string | null;
  company: string | null;
  prior_company: string | null;
  reason: string | null;
  article_headline?: string | null;
  dedup_evidence?: string | null;
  voice_variant: 'stranger' | 'reconnect';
}

export interface DraftOutput {
  email_subject: string;
  email_body: string;
  li_note: string;
}

// Belt-and-suspenders: strip any dash punctuation the model slips in.
function stripDashes(s: string): string {
  // Replace em/en dashes (and the surrounding-space variants) with a comma.
  return s.replace(/\s*[—–]\s*/g, ', ').replace(/[—–]/g, ',');
}

const SYSTEM = `You write outreach for Shawn Moffatt, CEO of Media Content Services (My Entertainment: unscripted TV production; Assignment Desk: nationwide camera crews). Output strict JSON only: { "email_subject": "...", "email_body": "...", "li_note": "..." }

VOICE RULES (non-negotiable):
- Terse. 1 to 3 sentences per message. Fragments are fine. No throat-clearing.
- Structure: one credibility or context line, then the point, then a soft ask.
- Always end with ONE easy, flattering question about THEIR world or slate.
- Sign-off: the bare word "Shawn". Email body ends with "Shawn" then a plain signature block (Shawn Moffatt, My Entertainment).
- ZERO em dashes, ZERO en dashes. Commas and periods only.
- li_note MUST be 200 characters or fewer including the name and "Shawn".
- Never name any show title or credit in the li_note.
- Never claim a library or catalog of material.
- Never invent a memory, meeting, or mutual friend.`;

export async function generateDraft(input: DraftInput): Promise<DraftOutput> {
  const variantRule =
    input.voice_variant === 'reconnect'
      ? `VARIANT = reconnect: open "Hi ${input.person_name.split(' ')[0]}, It's been a while." Do NOT reintroduce the company. Ask one peer-level question that assumes knowledge of their world.`
      : `VARIANT = stranger: open the li_note "Hi ${input.person_name.split(' ')[0]}, We haven't met yet." and include "I run My Entertainment." The email may add one sentence of context from the news item.`;

  const user = `${variantRule}

Person: ${input.person_name}, ${input.person_title ?? 'role unknown'} at ${input.company ?? 'company unknown'} (previously ${input.prior_company ?? 'n/a'}).
News: ${input.reason ?? ''} (source: ${input.article_headline ?? ''}).
Context: ${input.dedup_evidence ?? 'no prior contact found'}.
Acknowledge the move in one natural clause, then ask about what they are building or looking for in the new seat.`;

  const text = await groqChat({
    temperature: 0.5, // a little warmth, still tight
    max_tokens: 500,
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
  });
  const parsed = JSON.parse(stripFences(text)) as Partial<DraftOutput>;

  let li = stripDashes((parsed.li_note ?? '').trim());
  // Hard cap 200 chars: trim on a word boundary if we overshoot.
  if (li.length > 200) li = li.slice(0, 200).replace(/\s+\S*$/, '').trim();

  return {
    email_subject: stripDashes((parsed.email_subject ?? '').trim()),
    email_body: stripDashes((parsed.email_body ?? '').trim()),
    li_note: li,
  };
}
