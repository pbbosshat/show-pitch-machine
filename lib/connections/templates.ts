// Email templates for the Daily Connections compose modal.
//
// Ported in spirit from the Assignment Desk CRM (src/lib/crm-email-templates.ts):
// a small, fixed set of named templates with {{placeholder}} interpolation that
// the sender picks from a dropdown, then edits freely before sending.
//
// Voice note: Shawn's outreach is deliberately plain-text and short — no HTML
// marketing, no bullet lists, no signature block beyond his name. The drafts the
// LLM produces (lib/connections/draft.ts) follow the same rule, so these
// templates match that register on purpose. Keep them under ~90 words.
//
// The FIRST entry is always the AI draft already stored on the lead
// (draft_email_subject / draft_email_body); it is the default selection so the
// existing personalised draft is never lost behind a template picker.

export interface ConnectionEmailTemplate {
  id: string;
  /** Shown in the dropdown. */
  name: string;
  /** null = use the lead's stored AI draft verbatim. */
  subject: string | null;
  body: string | null;
  /** Short hint rendered under the dropdown so Shawn knows when to reach for it. */
  hint: string;
}

/**
 * Placeholders resolved by `renderTemplate`. Everything is optional because a
 * lead may be missing a company or role; missing values degrade to a neutral
 * phrase rather than leaving a raw {{token}} in the sent email.
 */
export interface TemplateVars {
  firstName?: string | null;
  fullName?: string | null;
  company?: string | null;
  role?: string | null;
  /** The "reason for connection" pulled from the trade article. */
  reason?: string | null;
  senderName?: string | null;
}

export const CONNECTION_EMAIL_TEMPLATES: ConnectionEmailTemplate[] = [
  {
    id: 'ai_draft',
    name: 'AI draft (personalized)',
    subject: null,
    body: null,
    hint: 'The draft already written for this lead from the trade article that surfaced them.',
  },
  {
    id: 'new_role',
    name: 'Congrats on the new role',
    subject: 'Congratulations, {{firstName}}',
    body:
      `{{firstName}}, congratulations on the move{{companyClause}}. I run My Entertainment — we produce and distribute unscripted series.\n` +
      `I'd love to hear what you're looking to build in the new role, and whether any of it overlaps with what we make.\n` +
      `Either way, glad to be connected.\n` +
      `{{senderName}}`,
    hint: 'For an exec move — someone starting somewhere new.',
  },
  {
    id: 'mandate',
    name: 'Responding to a mandate',
    subject: 'What you\'re looking for',
    body:
      `{{firstName}}, I saw {{reasonClause}}. I run My Entertainment — we produce and distribute unscripted series.\n` +
      `We have a few things in development that may line up. Worth a short call to see if any of it is useful to you?\n` +
      `{{senderName}}`,
    hint: 'When they have publicly said what they are buying.',
  },
  {
    id: 'intro',
    name: 'Straight introduction',
    subject: 'My Entertainment',
    body:
      `{{firstName}}, I run My Entertainment — we produce and distribute unscripted series.\n` +
      `I wanted to introduce myself and hear what you're focused on{{companyClause}} this year. Open to a quick call?\n` +
      `{{senderName}}`,
    hint: 'A clean cold intro when there is no specific news hook.',
  },
  {
    id: 'reconnect',
    name: 'Reconnecting',
    subject: 'Been a while',
    body:
      `{{firstName}}, it's been a while — I hope things are going well{{companyClause}}.\n` +
      `I run My Entertainment and we've got a slate of unscripted in development. I'd love to catch up and hear what you're after right now.\n` +
      `{{senderName}}`,
    hint: 'For someone already in Shawn\'s inbox or calendar history.',
  },
];

/**
 * Interpolate {{tokens}} in a template string.
 *
 * Two derived tokens keep sentences grammatical when data is missing:
 *   {{companyClause}} -> " at Netflix"  (or "" when company is unknown)
 *   {{reasonClause}}  -> the reason, lowercased to sit mid-sentence
 *
 * Any token with no value is replaced with '' rather than left as {{token}},
 * so a half-populated lead can never send a broken-looking email.
 */
export function renderTemplate(text: string, vars: TemplateVars): string {
  const first = (vars.firstName ?? vars.fullName ?? '').trim().split(/\s+/)[0] ?? '';
  const company = (vars.company ?? '').trim();
  const reason = (vars.reason ?? '').trim();

  const map: Record<string, string> = {
    firstName: first || 'there',
    fullName: (vars.fullName ?? '').trim(),
    company,
    role: (vars.role ?? '').trim(),
    reason,
    senderName: (vars.senderName ?? 'Shawn').trim(),
    companyClause: company ? ` at ${company}` : '',
    // Lowercase the first letter so it reads inside "I saw <reason>".
    reasonClause: reason ? reason.charAt(0).toLowerCase() + reason.slice(1) : 'the news',
  };

  return text.replace(/\{\{(\w+)\}\}/g, (_m, key: string) => map[key] ?? '');
}

/** Resolve a template id into concrete subject/body for a given lead. */
export function applyTemplate(
  templateId: string,
  vars: TemplateVars,
  aiDraft: { subject: string; body: string }
): { subject: string; body: string } {
  const tpl = CONNECTION_EMAIL_TEMPLATES.find((t) => t.id === templateId);
  // ai_draft (or an unknown id) falls back to whatever is stored on the lead.
  if (!tpl || tpl.subject === null || tpl.body === null) return aiDraft;
  return {
    subject: renderTemplate(tpl.subject, vars),
    body: renderTemplate(tpl.body, vars),
  };
}
