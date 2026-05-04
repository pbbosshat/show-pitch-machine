-- migrations/018_network_intel.sql
-- Adds market intelligence columns to buyer_companies so the Network Intel
-- tab can display external buying activity scores alongside live relationship
-- scores computed from deals, packages, and touches.
--
-- market_score      (0–10) External buying activity — set manually from quarterly
--                   trade research (Deadline, Variety, THR, Realscreen).
-- budget_signal     'expanding' | 'stable' | 'contracting' | 'frozen'
-- key_buyer         Current decision-maker name(s) at this network.
-- genre_mandate     JSON array of genre strings the network is actively buying.
-- intel_notes       One-line strategic note on this network's current posture.
-- intel_updated_at  Unix ms timestamp of when this intel was last refreshed.

ALTER TABLE buyer_companies ADD COLUMN market_score     REAL;
ALTER TABLE buyer_companies ADD COLUMN budget_signal    TEXT;
ALTER TABLE buyer_companies ADD COLUMN key_buyer        TEXT;
ALTER TABLE buyer_companies ADD COLUMN genre_mandate    TEXT;
ALTER TABLE buyer_companies ADD COLUMN intel_notes      TEXT;
ALTER TABLE buyer_companies ADD COLUMN intel_updated_at INTEGER;

-- ── Seed known networks by name (May 2026 research) ──────────────────────────
-- Uses broad LIKE patterns so it matches regardless of how the network was
-- entered (e.g. "A+E Networks", "A&E Networks", "A+E Global Media", etc.)
-- intel_updated_at = 1746403200000 = 2026-05-05 00:00:00 UTC

UPDATE buyer_companies SET
  market_score     = 8.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Frances Berwick (Chairman), Rachel Smith (EVP)',
  genre_mandate    = '["Housewives extensions","Celebrity docuseries","Competitive reality","True crime"]',
  intel_notes      = 'Peacock is NBCU growth engine. Rachel Smith actively seeking "fresh ideas unlike typical reality fare."',
  intel_updated_at = 1746403200000
WHERE name LIKE '%NBC%' OR name LIKE '%Peacock%' OR name LIKE '%Bravo%';

UPDATE buyer_companies SET
  market_score     = 9.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Sophie Leonard (EVP Unscripted)',
  genre_mandate    = '["Competition formats","Game shows","Culinary / Gordon Ramsay","House reality"]',
  intel_notes      = 'Most aggressive broadcast unscripted buyer. Fear Factor hit 16.5M multiplatform viewers; already renewed S2.',
  intel_updated_at = 1746403200000
WHERE (name LIKE '%Fox%' OR name LIKE '%FOX%') AND name NOT LIKE '%Searchlight%' AND name NOT LIKE '%Nation%';

UPDATE buyer_companies SET
  market_score     = 5.0,
  budget_signal    = 'contracting',
  key_buyer        = 'Paul Buccieri (Chair), Jordan Harman (dev)',
  genre_mandate    = '["Talent-anchored history","True crime","Law enforcement docu-reality","WWE / sports"]',
  intel_notes      = 'Warmest MYE relationship (shared building, Buccieri contact). Market dampened by Disney/Hearst sale process.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%A+E%' OR name LIKE '%A&E%' OR name LIKE '%A+E Global%' OR name LIKE '%History Channel%' OR name LIKE '%Lifetime%';

UPDATE buyer_companies SET
  market_score     = 8.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Jeff Gaspin (VP Unscripted), Jenny Falkoff',
  genre_mandate    = '["Dating / relationship formats","Korean variety","Sports docs","Social experiments"]',
  intel_notes      = 'Gaspin greenlit 18 reality + 14 docs for 2026. Strong market; MYE has acknowledged threads but zero greenlits.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Netflix%';

UPDATE buyer_companies SET
  market_score     = 5.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Jane Wiseman (Head Originals), Damla Dogan (unscripted)',
  genre_mandate    = '["Dating / relationship reality","True crime docs","Celebrity reality"]',
  intel_notes      = 'Just woke up post-Skydance freeze. First greenlit March 2026. Dogan already in MYE contact database.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Paramount%';

UPDATE buyer_companies SET
  market_score     = 4.0,
  budget_signal    = 'contracting',
  key_buyer        = 'Channing Dungey (Chairman), Howard Lee (CCO)',
  genre_mandate    = '["Franchise extensions","Lifestyle / home reno","Premium true crime docs"]',
  intel_notes      = 'Prefer franchise renewals over new IP. HGTV cut 7 shows. Best MYE play: Ghost Adventures renewal.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Warner Bros%' OR name LIKE '%Discovery%' OR name LIKE '%WBD%';

UPDATE buyer_companies SET
  market_score     = 7.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Amazon Unscripted team (post-Falkoff)',
  genre_mandate    = '["IP-backed competition","Massive-prize formats","Sports docs"]',
  intel_notes      = 'Beast Games S2/S3 ordered. Fallout: Shelter in production. No MYE relationship — build one.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Amazon%' OR name LIKE '%Prime Video%';

UPDATE buyer_companies SET
  market_score     = 7.0,
  budget_signal    = 'stable',
  key_buyer        = 'Hulu Originals unscripted team',
  genre_mandate    = '["Celebrity docu-reality","Lifestyle competition","Personality-driven reality"]',
  intel_notes      = 'Get Real House event signals active buying. Secret Lives, Kardashian-adjacent formats converting. No MYE relationship.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Hulu%';

UPDATE buyer_companies SET
  market_score     = 7.0,
  budget_signal    = 'stable',
  key_buyer        = 'Jason Sarlanis (President, ID/TNT/TBS)',
  genre_mandate    = '["Premium true crime docs","Serial killer docs","Cold case investigative"]',
  intel_notes      = 'Docbuster strategy: fewer but bigger true crime docs. Highest-volume true crime buyer in industry.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Investigation Discovery%' OR name LIKE '% ID %' OR name = 'ID';

UPDATE buyer_companies SET
  market_score     = 6.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Hallmark Originals unscripted team',
  genre_mandate    = '["Baking competition","Home renovation","Reality with Heart formats"]',
  intel_notes      = 'New entrant to unscripted (April 2025 initiative). Strict brand filter: joy/warmth/family only.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Hallmark%';

UPDATE buyer_companies SET
  market_score     = 6.0,
  budget_signal    = 'expanding',
  key_buyer        = 'Channel 4 Unscripted Development Fund team',
  genre_mandate    = '["Factual entertainment","Returnable formats","International adaptation"]',
  intel_notes      = 'New dev fund launched April 2026 targeting formats with global adaptation potential. 35% indie quota.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Channel 4%';

UPDATE buyer_companies SET
  market_score     = 6.0,
  budget_signal    = 'stable',
  key_buyer        = 'Kim Rozenfeld (unscripted)',
  genre_mandate    = '["Sports docs (elite access)","Premium true crime","Prestige documentary"]',
  intel_notes      = 'Very selective — 1-2 tentpole unscripted per year. Brand quality is the filter, not budget.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Apple%';

UPDATE buyer_companies SET
  market_score     = 6.0,
  budget_signal    = 'stable',
  key_buyer        = 'AMC Networks Originals team',
  genre_mandate    = '["Love After Lockup","Relationship reality","Family reality"]',
  intel_notes      = 'All Reality streaming service launched Nov 2025. Primarily library play; limited new commissions.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%AMC%';

UPDATE buyer_companies SET
  market_score     = 5.0,
  budget_signal    = 'stable',
  key_buyer        = 'HBO Documentary Films team',
  genre_mandate    = '["Investigative docs","Prestige documentary","Sports docs"]',
  intel_notes      = 'Zizians doc greenlit April 2026. Small volume, high prestige. Journalism-anchored true crime is the lane.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%HBO%' OR name LIKE '% Max' OR name = 'Max';

UPDATE buyer_companies SET
  market_score     = 4.0,
  budget_signal    = 'stable',
  key_buyer        = 'National Geographic Documentary team',
  genre_mandate    = '["Nature documentary","NatGeo prestige","Celebrity nature docs"]',
  intel_notes      = 'Not a general unscripted buyer. Reality routes through Hulu. NatGeo prestige docs only.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Disney%' OR name LIKE '%NatGeo%' OR name LIKE '%National Geographic%';

UPDATE buyer_companies SET
  market_score     = 3.0,
  budget_signal    = 'contracting',
  key_buyer        = 'Rob Swartz (development)',
  genre_mandate    = '["Celebrity true crime","Music docs","Sports / NFL"]',
  intel_notes      = 'Small cable buyer with contracting budget. Active MYE relationship but low volume and niche mandate.',
  intel_updated_at = 1746403200000
WHERE name LIKE '%Reelz%';
