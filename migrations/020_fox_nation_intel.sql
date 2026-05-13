-- 020_fox_nation_intel.sql
-- Fixes Fox Nation being incorrectly seeded with Fox broadcast intel in 018.
-- Fox Nation is a conservative streaming subscription platform — wholly different
-- buyer profile from Fox Broadcasting. This migration overwrites the wrong data
-- and also re-narrows the Fox broadcast update so it won't re-match Fox Nation
-- on a future clean install that runs 018 before this file.

-- Re-apply Fox broadcast intel with the corrected (narrower) WHERE clause
-- so that any DB that runs migrations out of order stays consistent.
UPDATE buyer_companies SET
  market_score     = 9.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Sophie Leonard (EVP Unscripted)',
  genre_mandate    = '["Competition formats","Game shows","Culinary / Gordon Ramsay","House reality"]',
  intel_notes      = 'Most aggressive broadcast unscripted buyer. Fear Factor hit 16.5M multiplatform viewers; already renewed S2.',
  intel_updated_at = 1746403200000
WHERE (name LIKE '%Fox%' OR name LIKE '%FOX%')
  AND name NOT LIKE '%Searchlight%'
  AND name NOT LIKE '%Nation%';

-- Fox Nation: conservative streaming platform, distinct mandate from Fox broadcast
UPDATE buyer_companies SET
  market_score     = 3.0,
  budget_signal    = 'stable',
  key_buyer        = 'Jason Klarman (President, Fox Nation)',
  genre_mandate    = '["Military / patriotic docs","Conservative lifestyle","Political commentary series","True American stories"]',
  intel_notes      = 'Subscription streaming for conservative audiences. Very niche mandate — military, patriotic, faith-friendly. Not a mainstream unscripted buyer.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Fox Nation%';
