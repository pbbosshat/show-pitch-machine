// Groq LLM client for email classification — the ONLY place in the codebase that
// calls an external AI API. All other "intelligence" comes from SQLite + LanceDB.
// Using llama-3.3-70b-versatile for its strong instruction-following on JSON tasks.

import Groq from 'groq-sdk';
import type { EmailClassification, GrokSignal } from '../types';

// Groq is OpenAI-compatible so the base URL only needs the v1 endpoint root
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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',
  baseURL: 'https://api.groq.com/openai/v1',
});

const MODEL = 'llama-3.3-70b-versatile';

interface ClassifyEmailInput {
  subject: string;
  sender: string;
  recipient: string;
  body: string;
  date: string;
  activePitches: Array<{ id: string; name: string; buyerName: string }>;
}

// Safe fallback returned when Groq is unreachable or returns unparseable JSON.
// Returning 'unrelated' prevents false pipeline moves on API errors.
const FALLBACK: EmailClassification = {
  pitch_related: false,
  package_id: null,
  signal: 'unrelated' as GrokSignal,
  meeting_date: null,
  pass_reason_quoted: null,
  deal_terms_mentioned: null,
  confidence: 'low',
};

export async function classifyEmail(emailData: ClassifyEmailInput): Promise<EmailClassification> {
  const pitchList = emailData.activePitches
    .map((p) => `  - ID: ${p.id} | Show: ${p.name} | Buyer: ${p.buyerName}`)
    .join('\n');

  const systemPrompt = `You are an email classifier for a TV production company's pitch pipeline.
You analyze inbound emails and determine if they relate to an active pitch, and if so, what the buyer's intent is.
You MUST respond with valid JSON only — no markdown, no explanation, no surrounding text.`;

  const userPrompt = `Classify this email against our active pitches.

ACTIVE PITCHES:
${pitchList || '  (none)'}

EMAIL:
Date: ${emailData.date}
From: ${emailData.sender}
To: ${emailData.recipient}
Subject: ${emailData.subject}

Body:
${emailData.body.slice(0, 3000)}

Respond with this exact JSON structure:
{
  "pitch_related": boolean,
  "package_id": string | null,
  "signal": "pass" | "meeting-request" | "in-review" | "deal-discussion" | "info-request" | "unrelated",
  "meeting_date": string | null,
  "pass_reason_quoted": string | null,
  "deal_terms_mentioned": string | null,
  "confidence": "high" | "medium" | "low"
}

Rules:
- pitch_related: true only if this email clearly references one of the active pitches above
- package_id: the ID from the pitch list if matched, else null
- signal: the buyer's intent — use "unrelated" if not pitch-related
- meeting_date: ISO date string if a specific meeting is being requested/confirmed, else null
- pass_reason_quoted: exact quoted phrase from the email explaining the pass, else null
- deal_terms_mentioned: brief summary of any deal terms mentioned, else null
- confidence: "high" if the match is unambiguous, "medium" if likely, "low" if uncertain`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      // Temperature 0 for deterministic classification — we need consistent JSON
      temperature: 0,
      max_tokens: 512,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';

    // Strip any accidental markdown code fences before parsing
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as EmailClassification;

    // Validate required fields exist before trusting the response
    if (typeof parsed.pitch_related !== 'boolean' || !parsed.signal) {
      throw new Error('Groq response missing required classification fields');
    }

    return parsed;
  } catch (err) {
    // Log the error for debugging but never let a classification failure crash the poller
    console.error('[groq] classifyEmail error:', err instanceof Error ? err.message : err);
    return FALLBACK;
  }
}
