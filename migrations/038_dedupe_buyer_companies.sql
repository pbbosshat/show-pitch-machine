-- 038_dedupe_buyer_companies.sql
-- Network Intel was showing three Fox rows (and turns out: doubled Netflix,
-- NBCUniversal, HBO/WBD, A+E Networks, Paramount+, Reelz, and Warner Bros.
-- Discovery too) because buyer_companies has no UNIQUE constraint on `name` —
-- only `id` is unique. Every seed/import script uses INSERT OR IGNORE which
-- de-dupes on id, not name, so separate UUIDs for the same buyer accumulate
-- across reruns. Migration 018 then runs `UPDATE … WHERE name LIKE 'X%'`,
-- stamping identical intel onto every accidental copy — which is why the
-- /network-intel page rendered the same row two or three times.
--
-- This migration:
--   1. Folds every literal-name duplicate group into one canonical row. For
--      each LOWER(TRIM(name)) group with > 1 row: pick the row with the most
--      buyer_contacts (tie-break oldest created_at), repoint every FK on
--      every other table that references buyer_companies(id), then delete
--      the losers.
--   2. Folds "Fox Corporation" into "Fox" specifically. It's a semantic
--      duplicate, not a literal one — same Sophie Leonard intel was stamped
--      on it by migration 018 because both match `name LIKE '%Fox%'`. The
--      LOWER(TRIM) loop won't catch it, so it's handled separately.
--   3. Adds a unique index on LOWER(TRIM(name)) so two rows literally named
--      "Fox" (or any name) can never coexist again. Distinct names like
--      "Fox", "Fox News", "Fox Sports", "Fox Searchlight", "Fox Nation" all
--      remain valid — the index only blocks exact-name duplicates.
--
-- FK targets folded into canonical (every table referencing buyer_companies(id)):
--   buyer_contacts.company_id, pitches.buyer_company_id,
--   packages.target_company_id, shows.network_id,
--   market_orders.buyer_company_id, deals.network_id,
--   buyer_companies.parent_id (self-ref from migration 019).

DO $$
DECLARE
  grp           RECORD;   -- one duplicate-name group
  canonical_id  TEXT;
  loser_ids     TEXT[];
BEGIN
  -- 1. Fold every literal-name duplicate group (LOWER+TRIM-normalized).
  FOR grp IN
    SELECT LOWER(TRIM(name)) AS normalized, COUNT(*) AS n
      FROM buyer_companies
      GROUP BY LOWER(TRIM(name))
      HAVING COUNT(*) > 1
  LOOP
    -- Canonical = the row with the most buyer_contacts. Tie-break by oldest
    -- created_at (NULLS LAST so legacy rows without a timestamp don't win).
    SELECT bc.id INTO canonical_id
      FROM buyer_companies bc
      LEFT JOIN buyer_contacts bcon ON bcon.company_id = bc.id
      WHERE LOWER(TRIM(bc.name)) = grp.normalized
      GROUP BY bc.id, bc.created_at
      ORDER BY COUNT(bcon.id) DESC, bc.created_at ASC NULLS LAST
      LIMIT 1;

    -- Every other row in this name group is a loser.
    SELECT array_agg(id) INTO loser_ids
      FROM buyer_companies
      WHERE LOWER(TRIM(name)) = grp.normalized
        AND id <> canonical_id;

    RAISE NOTICE '[038] folding % copies of "%" into %', grp.n, grp.normalized, canonical_id;

    -- Repoint every FK. Updates run inside the migration's outer transaction.
    UPDATE buyer_contacts  SET company_id        = canonical_id WHERE company_id        = ANY(loser_ids);
    UPDATE pitches         SET buyer_company_id  = canonical_id WHERE buyer_company_id  = ANY(loser_ids);
    UPDATE packages        SET target_company_id = canonical_id WHERE target_company_id = ANY(loser_ids);
    UPDATE shows           SET network_id        = canonical_id WHERE network_id        = ANY(loser_ids);
    UPDATE market_orders   SET buyer_company_id  = canonical_id WHERE buyer_company_id  = ANY(loser_ids);
    UPDATE deals           SET network_id        = canonical_id WHERE network_id        = ANY(loser_ids);
    UPDATE buyer_companies SET parent_id         = canonical_id WHERE parent_id         = ANY(loser_ids);

    DELETE FROM buyer_companies WHERE id = ANY(loser_ids);
  END LOOP;

  -- 2. "Fox Corporation" is a separate row that the loop above didn't catch
  --    because its normalized name differs from "Fox". It was nonetheless
  --    stamped with Fox-broadcast intel by migration 018 (name LIKE '%Fox%').
  --    Fold it into the canonical Fox row.
  SELECT id INTO canonical_id
    FROM buyer_companies WHERE LOWER(TRIM(name)) = 'fox' LIMIT 1;

  IF canonical_id IS NOT NULL THEN
    SELECT array_agg(id) INTO loser_ids
      FROM buyer_companies
      WHERE LOWER(TRIM(name)) = 'fox corporation'
        AND id <> canonical_id;

    IF loser_ids IS NOT NULL AND array_length(loser_ids, 1) > 0 THEN
      RAISE NOTICE '[038] folding Fox Corporation into canonical Fox %', canonical_id;
      UPDATE buyer_contacts  SET company_id        = canonical_id WHERE company_id        = ANY(loser_ids);
      UPDATE pitches         SET buyer_company_id  = canonical_id WHERE buyer_company_id  = ANY(loser_ids);
      UPDATE packages        SET target_company_id = canonical_id WHERE target_company_id = ANY(loser_ids);
      UPDATE shows           SET network_id        = canonical_id WHERE network_id        = ANY(loser_ids);
      UPDATE market_orders   SET buyer_company_id  = canonical_id WHERE buyer_company_id  = ANY(loser_ids);
      UPDATE deals           SET network_id        = canonical_id WHERE network_id        = ANY(loser_ids);
      UPDATE buyer_companies SET parent_id         = canonical_id WHERE parent_id         = ANY(loser_ids);
      DELETE FROM buyer_companies WHERE id = ANY(loser_ids);
    END IF;
  END IF;
END $$;

-- Prevent recurrence: no two rows can share the same case/whitespace-normalized
-- name. Idempotent via IF NOT EXISTS. After the cleanup above, this should
-- succeed on every environment.
CREATE UNIQUE INDEX IF NOT EXISTS idx_buyer_companies_name_unique
  ON buyer_companies (LOWER(TRIM(name)));
