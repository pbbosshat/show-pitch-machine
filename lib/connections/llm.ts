// Shared Groq caller for the Daily Connections pipeline.
//
// Uses a raw fetch (not the groq-sdk) with `Connection: close` and a small retry
// loop. Reason: the groq-sdk reuses a pooled keep-alive socket that Groq closes
// between our paced calls, which surfaced as "Premature close" on every request
// during the daily build. A fresh connection per call is rock-solid here.
//
// Key comes from GROQ_API_KEY (.env.local / .env). Model is overridable via
// GROQ_MODEL.
//
// MODEL CHOICE — read before changing. Groq retires hosted models on its own
// schedule, and a retired model does not fail loudly here: extraction returns no
// people, so buildDailyConnections reports `built: 0` with a 200, and the daily
// build quietly produces nothing. That is exactly what happened between
// 2026-08-13 and 2026-08-18, when `llama-3.3-70b-versatile` (the previous
// default) began returning:
//
//   404 model_not_found — "The model `llama-3.3-70b-versatile` does not exist
//   or you do not have access to it."
//
// It looked like a broken scheduler for five days. It was a dead model.
//
// openai/gpt-oss-120b is the largest general-purpose chat model available on
// this account (verified 2026-08-18 against /v1/models) and returns the same
// strict-JSON shape the extractor and drafter expect. If it disappears too,
// list the live models with:
//   curl -s https://api.groq.com/openai/v1/models -H "Authorization: Bearer $GROQ_API_KEY"
export const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Strip accidental ```json fences an LLM sometimes wraps around JSON output. */
export function stripFences(text: string): string {
  return text.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim();
}

/**
 * One chat completion, returning the assistant message content string.
 * Retries transient network/5xx errors up to 3 times with linear backoff.
 * Throws the last error (with the exact Groq status + body) if all attempts fail
 * so callers can surface the real reason instead of a generic failure.
 */
export async function groqChat(opts: {
  messages: GroqMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const model = opts.model || GROQ_MODEL;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${key}`,
          'Content-Type': 'application/json',
          // Avoid keep-alive socket reuse (the "Premature close" fix).
          Connection: 'close',
        },
        body: JSON.stringify({
          model,
          temperature: opts.temperature ?? 0,
          max_tokens: opts.max_tokens ?? 700,
          messages: opts.messages,
        }),
      });
      if (!res.ok) {
        const bodyText = (await res.text()).slice(0, 240);
        // A retired/unavailable model is the highest-cost failure in this
        // pipeline (silent empty builds), so name the cause and the fix rather
        // than passing Groq's raw 404 up the stack.
        if (res.status === 404 && /model/i.test(bodyText)) {
          throw new Error(
            `Groq model "${model}" is unavailable — Groq retires hosted models, and this ` +
              `fails silently as empty extractions and zero-lead builds. List live models with ` +
              `GET https://api.groq.com/openai/v1/models and set GROQ_MODEL (or update the ` +
              `default in lib/connections/llm.ts). Groq said: ${bodyText}`
          );
        }
        // 4xx (bad key, bad request) will not get better on retry: throw now.
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          throw new Error(`Groq ${res.status}: ${bodyText}`);
        }
        // 429 / 5xx: retryable.
        throw new Error(`Groq ${res.status} (retryable): ${bodyText}`);
      }
      const j = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return j.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
