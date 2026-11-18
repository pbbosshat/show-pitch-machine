-- 051_fin_login_success.sql — MYE Admin: remember where each person last signed in
-- successfully, so the all-IP per-email sign-in cap can't lock the real user out.
-- One row per (email, IP), refreshed on each successful sign-in; rows older than
-- 30 days are ignored and pruned. Additive only; safe to re-run.
CREATE TABLE IF NOT EXISTS fin_login_successes (
  email   TEXT NOT NULL,
  ip      TEXT NOT NULL,
  last_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (email, ip)
);
CREATE INDEX IF NOT EXISTS fin_login_successes_last_at_idx ON fin_login_successes (last_at);
