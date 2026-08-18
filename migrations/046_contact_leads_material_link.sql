-- 046_contact_leads_material_link.sql
-- Optional link to the submitted material itself (Google Drive, Dropbox, Vimeo,
-- WeTransfer, …), collected alongside the Submissions Release fields from 045.
--
-- WHY a link and not a file upload: the form previously described the material
-- (title/nature/pages) but offered no way to hand it over — submitters had to
-- wait for a reply and email it. Industry practice is shareable links (decks in
-- Drive, screeners on Vimeo); actual file upload would need storage this app
-- doesn't have and invites abuse on a public endpoint, so it was ruled out.
--
-- Nullable: the field is optional (a submitter may not have a link ready — the
-- development team replies and requests materials in that case), and every
-- pre-existing row and ungated lead has no link by definition.

ALTER TABLE contact_leads
  ADD COLUMN IF NOT EXISTS material_link TEXT;
