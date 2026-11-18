-- 050_fin_qbo_fixes.sql — MYE Admin: QuickBooks company-switch guard, sync log
-- request ids, and per-IP sign-in limits. Additive only; safe to re-run.

-- The QuickBooks company (realm) last connected. Kept across Disconnect, so that
-- connecting a DIFFERENT company (e.g. sandbox → real books) can be detected and the
-- old company's Account/Class/card ids cleared instead of being posted to the new one.
ALTER TABLE fin_qbo_connection ADD COLUMN IF NOT EXISTS last_realm_id TEXT;
UPDATE fin_qbo_connection SET last_realm_id = realm_id WHERE last_realm_id IS NULL AND realm_id IS NOT NULL;

-- The Intuit requestid each post used. Lets a retry tell whether an earlier
-- "outcome unknown" attempt sent the same payload (Intuit dedupes it) or a different
-- one (we must look in QuickBooks before posting again).
ALTER TABLE fin_qbo_sync_log ADD COLUMN IF NOT EXISTS request_id TEXT;

-- Client IP of each failed sign-in, for the per-IP and per-email-per-IP limits.
ALTER TABLE fin_login_failures ADD COLUMN IF NOT EXISTS ip TEXT;
CREATE INDEX IF NOT EXISTS fin_login_failures_ip_idx ON fin_login_failures (ip, created_at);
