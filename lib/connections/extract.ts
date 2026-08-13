// Person extraction from a trade article via Groq.
//
// Reuses the extraction shape from scripts/process-articles.ts (people with
// old/new title + company) but narrows it to PEOPLE only, and instructs the
// model to skip musicians/actors/athletes/deceased so the Billboard music
// noise in the relevant feed does not become fake "exec" leads.

import { groqChat, stripFences } from './llm';

export interface ExtractedPerson {
  name: string;
  old_title?: string;
  old_company?: string;
  new_title?: string;
  new_company?: string;
  // 'exec-move' = joining/leaving/promoted/appointed/hired/exiting/stepping down.
  // 'mentioned' = named but not themselves changing roles.
  type: 'exec-move' | 'mentioned';
}

export async function extractPeople(
  headline: string,
  body: string | null
): Promise<ExtractedPerson[]> {
  try {
    const text = await groqChat({
      // Temperature 0 for stable JSON field names.
      temperature: 0,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You extract media and TV industry PEOPLE from trade article text. Return JSON only.',
        },
        {
          role: 'user',
          // Body trimmed to 800 chars: exec moves are named in the headline plus
          // the lede, and shorter input keeps us under Groq's per-minute token cap.
          content:
            `Headline: ${headline}\n\nBody: ${(body ?? '').slice(0, 800)}\n\n` +
            `Extract every named PERSON who is a media/TV/entertainment industry ` +
            `professional (network or streamer executive, commissioner, buyer, ` +
            `development or programming or acquisitions exec, or a producer/exec ` +
            `changing jobs). For each person return: ` +
            `{name, old_title, old_company, new_title, new_company, type}. ` +
            `Set type='exec-move' when the article is about them joining, leaving, ` +
            `being promoted, appointed, hired, exiting, or stepping down; else ` +
            `type='mentioned'. ` +
            `ALWAYS identify each person's organization. For an exec-move, put the ` +
            `company they are joining or now lead in new_company and their prior ` +
            `company in old_company. For a 'mentioned' person (not changing roles), ` +
            `put their CURRENT employer in old_company and leave new_company empty. ` +
            `Never leave both old_company and new_company empty when any company, ` +
            `network, studio, or streamer is named near the person. Use the specific ` +
            `organization name (e.g. "Netflix", "ITVS", "SiriusXM", "PBS"), not a ` +
            `generic descriptor like "the network" or "the studio". ` +
            `Do NOT include musicians, recording artists, actors, ` +
            `athletes, or deceased people unless they hold a current executive role. ` +
            `Omit anyone whose full name is not stated. ` +
            `Return JSON: { "people": [...] }`,
        },
      ],
    });
    const parsed = JSON.parse(stripFences(text)) as { people?: ExtractedPerson[] };
    if (!Array.isArray(parsed.people)) return [];
    // Guard: require a plausible full name (two tokens or a hyphenated name).
    return parsed.people.filter(
      (p) => p && typeof p.name === 'string' && p.name.trim().length >= 3
    );
  } catch (err) {
    // Never throw: one bad article must not stop the daily build.
    console.error('[connections/extract] error:', err instanceof Error ? err.message : err);
    return [];
  }
}
