-- 048_fin_admin.sql — MYE Admin finance area (Amex reconciliation + QuickBooks sync).
--
-- Walled off from the staff app: its own users, sessions and data. Nothing here
-- touches an existing table. Every statement is CREATE ... IF NOT EXISTS so the
-- file is safe on a fresh database and on the existing production schema.
-- Money is stored as integer cents (BIGINT). Credits are negative.

-- People who can sign in to /admin. role: admin | cardholder.
CREATE TABLE IF NOT EXISTS fin_users (
  id            BIGSERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin', 'cardholder')),
  password_hash TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);
-- Email lookups at login are case-insensitive.
CREATE UNIQUE INDEX IF NOT EXISTS fin_users_email_lower_idx ON fin_users (lower(email));

-- Admin-area sessions (cookie mye_admin_session). Separate from staff `sessions`.
CREATE TABLE IF NOT EXISTS fin_sessions (
  token      TEXT PRIMARY KEY,
  user_id    BIGINT REFERENCES fin_users ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS fin_sessions_user_idx ON fin_sessions (user_id);

-- Failed sign-in attempts, used for the per-email lockout (10 in 15 minutes).
CREATE TABLE IF NOT EXISTS fin_login_failures (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_login_failures_email_idx ON fin_login_failures (email, created_at);

-- Amex "Card Member" name -> fin_users. amex_name is normalized: upper(trim()).
CREATE TABLE IF NOT EXISTS fin_cardholder_aliases (
  id        BIGSERIAL PRIMARY KEY,
  amex_name TEXT UNIQUE NOT NULL,
  user_id   BIGINT REFERENCES fin_users
);

-- One row per uploaded monthly statement. statement_month = first of month.
CREATE TABLE IF NOT EXISTS fin_statements (
  id                    BIGSERIAL PRIMARY KEY,
  statement_month       DATE UNIQUE NOT NULL,
  file_name             TEXT,
  uploaded_by           BIGINT REFERENCES fin_users,
  uploaded_at           TIMESTAMPTZ DEFAULT now(),
  statement_total_cents BIGINT,
  closed_at             TIMESTAMPTZ,
  closed_by             BIGINT REFERENCES fin_users
);

-- Individual card charges (and credits) from a statement.
CREATE TABLE IF NOT EXISTS fin_charges (
  id                 BIGSERIAL PRIMARY KEY,
  statement_id       BIGINT REFERENCES fin_statements ON DELETE CASCADE,
  txn_date           DATE NOT NULL,
  amex_description   TEXT NOT NULL,
  card_member        TEXT NOT NULL,
  amex_reference     TEXT,
  extended_details   TEXT,
  amount_cents       BIGINT NOT NULL,
  cardholder_id      BIGINT REFERENCES fin_users,
  possible_duplicate BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at         TIMESTAMPTZ,
  account_qbo_id     TEXT,
  account_name       TEXT,
  class_qbo_id       TEXT,
  class_name         TEXT,
  memo               TEXT,
  tagged_by          BIGINT REFERENCES fin_users,
  tagged_at          TIMESTAMPTZ,
  status             TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'tagged', 'synced')),
  qbo_txn_id         TEXT UNIQUE,
  qbo_txn_type       TEXT,
  synced_at          TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS fin_charges_statement_idx  ON fin_charges (statement_id);
CREATE INDEX IF NOT EXISTS fin_charges_cardholder_idx ON fin_charges (cardholder_id);
CREATE INDEX IF NOT EXISTS fin_charges_status_idx     ON fin_charges (status);

-- One optional receipt per charge (photo or PDF, max 10 MB enforced in the API).
CREATE TABLE IF NOT EXISTS fin_receipts (
  id                BIGSERIAL PRIMARY KEY,
  charge_id         BIGINT UNIQUE REFERENCES fin_charges ON DELETE CASCADE,
  file_name         TEXT,
  mime_type         TEXT,
  data              BYTEA NOT NULL,
  size_bytes        INT,
  uploaded_by       BIGINT REFERENCES fin_users,
  uploaded_at       TIMESTAMPTZ DEFAULT now(),
  qbo_attachable_id TEXT
);

-- Single-row QuickBooks Online connection (id is always 1).
CREATE TABLE IF NOT EXISTS fin_qbo_connection (
  id                  INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  realm_id            TEXT,
  access_token        TEXT,
  access_expires_at   TIMESTAMPTZ,
  refresh_token       TEXT,
  refresh_expires_at  TIMESTAMPTZ,
  connected_by        BIGINT REFERENCES fin_users,
  connected_at        TIMESTAMPTZ,
  card_account_qbo_id TEXT
);

-- Cached QuickBooks chart of accounts.
CREATE TABLE IF NOT EXISTS fin_qbo_accounts (
  qbo_id               TEXT PRIMARY KEY,
  acct_num             TEXT,
  name                 TEXT NOT NULL,
  fully_qualified_name TEXT,
  account_type         TEXT,
  active               BOOLEAN,
  refreshed_at         TIMESTAMPTZ
);

-- Cached QuickBooks classes.
CREATE TABLE IF NOT EXISTS fin_qbo_classes (
  qbo_id               TEXT PRIMARY KEY,
  name                 TEXT NOT NULL,
  fully_qualified_name TEXT,
  active               BOOLEAN,
  refreshed_at         TIMESTAMPTZ
);

-- Every attempt to post a charge to QuickBooks, successful or not.
CREATE TABLE IF NOT EXISTS fin_qbo_sync_log (
  id         BIGSERIAL PRIMARY KEY,
  charge_id  BIGINT REFERENCES fin_charges ON DELETE CASCADE,
  ok         BOOLEAN NOT NULL,
  message    TEXT,
  qbo_txn_id TEXT,
  created_by BIGINT REFERENCES fin_users,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fin_qbo_sync_log_charge_idx ON fin_qbo_sync_log (charge_id, created_at);
