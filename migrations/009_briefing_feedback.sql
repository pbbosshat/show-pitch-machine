-- 009_briefing_feedback.sql
-- Captures per-article user signals for filter tuning. One row per article
-- (UNIQUE on article_id); re-selecting a reason replaces the prior one.
-- headline/source are snapshotted so the review query needs no joins.
--
-- Postgres conversions:
--   • `INTEGER PRIMARY KEY AUTOINCREMENT` → `BIGSERIAL PRIMARY KEY`.
--     BIGSERIAL gives an auto-incrementing BIGINT (matches SQLite's behaviour
--     where rowid grows unbounded). Phase 1B callers that read `id` from this
--     table will get a number/bigint from pg — same shape as before.
--   • `CAST(strftime('%s', 'now') AS INTEGER) * 1000` → `(EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT`.
CREATE TABLE IF NOT EXISTS briefing_feedback (
  id         BIGSERIAL PRIMARY KEY,
  article_id TEXT NOT NULL,
  reason     TEXT NOT NULL,
  headline   TEXT,
  source     TEXT,
  created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  UNIQUE (article_id)
);

CREATE INDEX IF NOT EXISTS idx_briefing_feedback_reason     ON briefing_feedback(reason);
CREATE INDEX IF NOT EXISTS idx_briefing_feedback_created_at ON briefing_feedback(created_at);
