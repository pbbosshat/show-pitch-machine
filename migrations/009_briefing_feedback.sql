-- Migration 009: briefing feedback — captures per-article user signals for filter tuning.
-- One row per article (UNIQUE on article_id); re-selecting a reason replaces the prior one.
-- headline/source are snapshotted so the review query needs no joins.
CREATE TABLE IF NOT EXISTS briefing_feedback (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  article_id TEXT NOT NULL,
  reason     TEXT NOT NULL,
  headline   TEXT,
  source     TEXT,
  created_at INTEGER DEFAULT (CAST(strftime('%s', 'now') AS INTEGER) * 1000),
  UNIQUE (article_id)
);

CREATE INDEX IF NOT EXISTS idx_briefing_feedback_reason     ON briefing_feedback(reason);
CREATE INDEX IF NOT EXISTS idx_briefing_feedback_created_at ON briefing_feedback(created_at);
