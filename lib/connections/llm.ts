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
  /** Override the reasoning budget. See REASONING NOTE below. */
  reasoning_effort?: 'low' | 'medium' | 'high';
}): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY is not set');
  const model = opts.model || GROQ_MODEL;

  // ── REASONING NOTE (why reasoning_effort is forced low) ────────────────────
  // gpt-oss models think before answering, and those reasoning tokens are billed
  // against the SAME max_tokens budget as the visible answer. At the drafter's
  // max_tokens=800 the model spent all 800 on reasoning and returned an EMPTY
  // content string — surfacing as "Unexpected end of JSON input" at the
  // JSON.parse, which reads like a malformed model response rather than a
  // truncation. Measured on the real draft prompt:
  //
  //   max_tokens 800, default effort -> finish=length, content 0 chars, FAILS
  //   max_tokens 800, effort=low     -> finish=stop,   content 547 chars, parses
  //   max_tokens 2000, default effort-> finish=stop,   but burns 1358 tokens
  //
  // Low effort is not a quality compromise here: every call in this pipeline is
  // structured extraction or short copy against an explicit rubric, not a task
  // that benefits from long deliberation. It also matters for throughput — this
  // account is capped at 8,000 tokens/minute, so a daily build at ~1,350 tokens
  // per lead would rate-limit itself; at ~450 it does not.
  //
  // Only sent to models that accept it (Groq rejects the field on others).
  const supportsReasoningEffort = /gpt-oss|^qwen\//i.test(model);
  const reasoningEffort = opts.reasoning_effort ?? 'low';

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
          ...(supportsReasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
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
      const j = (await res.json()) as {
        choices?: { message?: { content?: string }; finish_reason?: string }[];
      };
      const choice = j.choices?.[0];
      const content = choice?.message?.content?.trim() ?? '';

      // An empty completion is never useful, and returning '' pushes the failure
      // downstream to a JSON.parse that reports "Unexpected end of JSON input" —
      // which reads like a malformed model response rather than the truncation it
      // actually is. Name it here, where the finish_reason is still in hand.
      if (!content) {
        throw new Error(
          choice?.finish_reason === 'length'
            ? `Groq returned an empty completion (finish_reason=length): the token budget ` +
              `was consumed before any output. Raise max_tokens or lower reasoning_effort.`
            : `Groq returned an empty completion (finish_reason=${choice?.finish_reason ?? 'unknown'}).`
        );
      }
      return content;
    } catch (err) {
      lastErr = err;
      if (attempt < 3) await new Promise((r) => setTimeout(r, 800 * attempt));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
