// LLM-based article enrichment — extracts a brief, production company, buyer name,
// and buyer company from a trade article's headline + body.
// Uses Groq (already configured) to keep consistent with the email classifier pattern.
// Called exclusively from the batch enrich API route; results are cached in trade_articles.

import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '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',
  baseURL: 'https://api.groq.com',
});

const MODEL = 'llama-3.3-70b-versatile';

export interface ArticleEnrichment {
  brief: string | null;
  production_company: string | null;
  buyer_name: string | null;
  buyer_company: string | null;
}

const EMPTY: ArticleEnrichment = {
  brief: null,
  production_company: null,
  buyer_name: null,
  buyer_company: null,
};

export async function enrichArticle(
  headline: string,
  body: string | null,
  item_type: string | null,
): Promise<ArticleEnrichment> {
  const content = body
    ? `${headline}\n\n${body.slice(0, 1500)}`
    : headline;

  const userPrompt = `You are extracting structured data from a TV trade publication article.

ARTICLE:
${content}

Return ONLY this JSON, nothing else:
{
  "brief": "one sentence explaining why this is significant to an unscripted TV production company that pitches formats to streaming platforms and networks",
  "production_company": "name of the production company making the show, or null if not mentioned",
  "buyer_name": "full name of the specific executive or buyer person involved, or null",
  "buyer_company": "name of the network, streamer, or studio that ordered or is involved, or null"
}

Rules:
- brief: specific to THIS article's news, not generic. Max 25 words.
- For exec-move items: buyer_name = the exec's name, buyer_company = where they moved TO
- For greenlit/cancelled items: buyer_company = the network or streamer
- Return null for any field not clearly stated in the article
- Return null for buyer_name if it is only a company name, not a person's name`;

  try {
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: 'Extract structured data from TV trade articles. Return only valid JSON.' },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 300,
    });

    const text = response.choices[0]?.message?.content?.trim() ?? '';
    const cleaned = text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '');
    const parsed = JSON.parse(cleaned) as ArticleEnrichment;

    return {
      brief: parsed.brief?.trim() || null,
      production_company: parsed.production_company?.trim() || null,
      buyer_name: parsed.buyer_name?.trim() || null,
      buyer_company: parsed.buyer_company?.trim() || null,
    };
  } catch (err) {
    console.error('[enrich] error:', err instanceof Error ? err.message : err);
    return EMPTY;
  }
}
