-- 024_fix_contact_leads_fk.sql
-- contact_leads.available_title_id used to reference available_titles(id); the
-- data is now in deck_sites. In SQLite this required a table rebuild + PRAGMA
-- toggles. In Postgres we can DROP the old FK and ADD a new one in place.
--
-- The DO block locates and drops whichever FK constraint pg auto-named for
-- the previous reference, then re-adds the new constraint pointing at deck_sites.
-- Wrapped in IF NOT EXISTS checks so the migration is safe on a fresh schema
-- (where no prior FK exists) and on an already-migrated DB.

-- Drop any existing FK on contact_leads.available_title_id, whatever it's named.
DO $$
DECLARE
  con_name TEXT;
BEGIN
  SELECT tc.constraint_name INTO con_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
   AND kcu.constraint_schema = tc.constraint_schema
  WHERE tc.table_name = 'contact_leads'
    AND tc.constraint_type = 'FOREIGN KEY'
    AND kcu.column_name = 'available_title_id'
  LIMIT 1;

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE contact_leads DROP CONSTRAINT %I', con_name);
  END IF;
END $$;

-- Re-add the FK pointing at deck_sites(id) so deck-page contact submissions
-- can be saved and linked.
ALTER TABLE contact_leads
  ADD CONSTRAINT contact_leads_available_title_id_fkey
  FOREIGN KEY (available_title_id) REFERENCES deck_sites(id);
