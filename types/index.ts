// Canonical TypeScript types for all Show Pitch Machine database entities.
// Single source of truth — UI, API routes, MCP tools, and seed scripts all import from here.

export type PipelineStage =
  | 'proposal'
  | 'sent'
  | 'in-review'
  | 'meeting'
  | 'negotiating'
  | 'greenlit'
  | 'pass';

export type ActivityStatus = 'active' | 'quiet' | 'unknown';

// Groq/LLM classification signals for inbound emails — maps to pipeline stage transitions
export type GrokSignal =
  | 'pass'
  | 'meeting-request'
  | 'in-review'
  | 'deal-discussion'
  | 'info-request'
  | 'unrelated';

export type GrokConfidence = 'high' | 'medium' | 'low';

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: string | null;
  created_at: number | null;
}

export interface BuyerCompany {
  id: string;
  name: string;
  // streamer | network | major | mid — drives tier logic in pitch targeting
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
}

export interface BuyerContact {
  id: string;
  company_id: string | null;
  name: string;
  email: string | null;
  title: string | null;
  mandate_statement: string | null;
  mandate_source: string | null;
  mandate_source_url: string | null;
  mandate_date: number | null;
  last_greenlit_date: number | null;
  orders_last_90_days: number;
  orders_last_365_days: number;
  activity_status: ActivityStatus;
  last_mye_contact_date: number | null;
  last_mye_contact_outcome: string | null;
  mye_pitch_count: number;
  company_history: string | null;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
  // Added in migration 005: buyer role classification
  role_type: BuyerRoleType | null;
  // 1 if current title is a development/acquisitions seat (vs in-house staff role)
  is_buyer_seat: number;
  // 'independent' | 'in_house' | 'mixed' — what kind of shows they commission
  production_type_focus: string | null;
  // Added in migration 006: where did the mandate statement come from?
  // 'email' | 'sheet' | 'trade' | 'manual'
  mandate_data_source: string | null;
  // Added in migration 015: verification tracking
  is_verified: number;
  verified_at: number | null;
  verified_by: string | null;
  // Added in migration 004: phone extracted from email signatures
  phone: string | null;
  // Added in migration 017: enrichment pipeline fields
  // mye_user_email of the most recent touch (subquery result, not a DB column)
  last_contacted_by: string | null;
  // Joined from buyer_companies via company_id FK — not a DB column on buyer_contacts
  company_name: string | null;
}

export interface MandateUpdate {
  id: string;
  contact_id: string;
  statement: string;
  source: string | null;
  source_url: string | null;
  stated_date: number | null;
  scraped_at: number | null;
}

export interface IpCatalog {
  id: string;
  title: string;
  logline: string | null;
  format: string | null;
  genre: string | null;
  subgenre: string | null;
  episode_count: number | null;
  status: string | null;
  rights_status: string | null;
  rights_expiry: number | null;
  seasons_count: number | null;
  // 1 = existing MYE library asset (e.g. Ghost Adventures back catalog)
  is_library: number;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
  // Added in migration 006: where did this record originate?
  // 'csv' = mye_pitch_database.csv | 'sheet' = Google Sheet | 'manual' = hardcoded/UI | 'email' = email-only match
  origin_source: 'csv' | 'sheet' | 'manual' | 'email';
}

export interface Talent {
  id: string;
  name: string;
  primary_role: string | null;
  mye_relationship: string | null;
  last_contact: number | null;
  notes: string | null;
}

export interface IpTalent {
  ip_id: string;
  talent_id: string;
  role: string | null;
}

export interface ContentPartner {
  id: string;
  name: string;
  type: string | null;
  access_description: string | null;
  genres_unlocked: string | null;
  deal_expiry: number | null;
  contact_name: string | null;
  contact_email: string | null;
  notes: string | null;
}

export interface IpContentPartner {
  ip_id: string;
  partner_id: string;
  notes: string | null;
}

export interface Pitch {
  id: string;
  ip_id: string | null;
  buyer_company_id: string | null;
  buyer_contact_id: string | null;
  pitch_date: number | null;
  format_pitched: string | null;
  outcome: string | null;
  pass_reason: string | null;
  pass_reason_cat: string | null;
  thread_id: string | null;
  notes: string | null;
  created_at: number | null;
}

export interface Package {
  id: string;
  name: string;
  ip_id: string | null;
  target_company_id: string | null;
  target_contact_id: string | null;
  created_by: string | null;
  pipeline_stage: PipelineStage;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  narrative: string | null;
  // JSON array of show IDs used as comps in the pitch narrative
  comp_show_ids: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
  created_at: number | null;
  updated_at: number | null;
}

export interface PackageTalent {
  package_id: string;
  talent_id: string;
}

export interface PackageContentPartner {
  package_id: string;
  partner_id: string;
}

export interface PackageEmail {
  id: string;
  package_id: string | null;
  gmail_thread_id: string | null;
  subject: string | null;
  sender: string | null;
  received_at: number | null;
  grok_signal: GrokSignal | null;
  // Raw JSON string of the full Groq classification response
  grok_raw: string | null;
  stage_moved_to: string | null;
  processed_at: number | null;
}

export interface PitchPortal {
  id: string;
  package_id: string | null;
  // URL-safe slug used in the /portal/:slug route
  slug: string;
  pdf_path: string | null;
  sent_at: number | null;
  sent_to: string | null;
  created_at: number | null;
}

export interface Show {
  id: string;
  title: string;
  title_normalized: string | null;
  network: string | null;
  network_id: string | null;
  buyer_contact_name: string | null;
  buyer_contact_id: string | null;
  production_company: string | null;
  production_company_2: string | null;
  showrunner: string | null;
  executive_producers: string | null;
  host: string | null;
  talent: string | null;
  format: string | null;
  genre: string | null;
  subgenre: string | null;
  is_unscripted: number;
  episode_count: number | null;
  season_number: number | null;
  runtime_mins: number | null;
  order_type: string | null;
  status: string | null;
  greenlit_date: number | null;
  production_start: number | null;
  premiere_date: number | null;
  location_type: string | null;
  primary_state: string | null;
  primary_city: string | null;
  primary_country: string | null;
  filming_states: string | null;
  location_notes: string | null;
  source: string | null;
  source_url: string | null;
  // Full article text — stored so we can re-embed without re-scraping
  raw_article: string | null;
  imdb_id: string | null;
  tmdb_id: string | null;
  // Relevance classification — see scrapers/classify.ts
  format_type: string | null;
  relevance_tier: string | null;
  created_at: number | null;
  updated_at: number | null;
  // Added in migration 005: structured prodco FK and production type
  prodco_id: string | null;
  prodco_2_id: string | null;
  // 'independent' | 'in_house' — in_house means the network made it themselves
  production_type: string | null;
  // Added in migration 006: data provenance
  // 'manual' = hand-coded seed/UI | 'sheet' = Google Sheet | 'trade' = scraper
  data_source: 'manual' | 'sheet' | 'trade';
  // FK to ip_catalog when this comp show is also an MYE title
  ip_catalog_id: string | null;
  // Added in migration 011: show lifecycle tracking and TVMaze enrichment
  air_status: 'on_air' | 'available' | 'off_air' | null;
  // 1 = MYE-produced show (Ghost Adventures, Destination Fear, etc.), 0 = comp/market show
  is_our_show: number;
  total_seasons: number | null;
  schedule: string | null;
  off_air_date: number | null;
  tvmaze_id: number | null;
  notes: string | null;
}

export interface TradeArticle {
  id: string;
  source: string | null;
  url: string | null;
  headline: string | null;
  body: string | null;
  item_type: string | null;
  scraped_at: number | null;
  // 0 until the article has been chunked and inserted into LanceDB
  embedded: number;
  // Relevance classification — see scrapers/classify.ts
  format_type: string | null;
  relevance_tier: string | null;
  signal_type: string | null;
  tier_reason: string | null;
}

export interface MarketOrder {
  id: string;
  show_id: string | null;
  show_title: string | null;
  network: string | null;
  buyer_company_id: string | null;
  buyer_contact_id: string | null;
  format: string | null;
  genre: string | null;
  episode_count: number | null;
  order_type: string | null;
  order_date: number | null;
  source: string | null;
  source_url: string | null;
  created_at: number | null;
}

// Ownership classification for production companies
export type ProdcoOwnership = 'independent' | 'studio_owned' | 'network_owned';

// Strategic relationship to MYE
export type ProdcoStrategicTag = 'co_pro_partner' | 'acquisition_target' | 'competitor' | 'watch_list';

export interface ProductionCompany {
  id: string;
  name: string;
  name_normalized: string;
  ownership_type: ProdcoOwnership;
  parent_company: string | null;
  // JSON array of primary genres stored as string in DB
  genres: string | null;
  strategic_tag: ProdcoStrategicTag;
  notes: string | null;
  website: string | null;
  hq_city: string | null;
  created_at: number | null;
  updated_at: number | null;
  // Enrichment fields from spreadsheet import (all optional — not present on legacy rows)
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  bio: string | null;
  linkedin_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  organization_type: string | null;
  contact_status: string | null;
  contacted_detail: string | null;
  // Stored as JSON array strings — parse on the client when needed
  current_shows: string | null;
  current_networks: string | null;
  employee_count: string | null;
  source_sheet: string | null;
  // CMPA membership enrichment (migration 013)
  is_cmpa_member: number | null;
  primary_platform: string | null;
  production_model: string | null;
}

export interface ProdcoContact {
  id: string;
  prodco_id: string;
  name: string;
  title: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  outreach_status: string | null;
  is_owner: number;
  notes: string | null;
  created_at: number;
}

// deal_type values — commission is the default (network orders from prodco)
export type DealType = 'commission' | 'co_production' | 'acquisition' | 'format_sale';

export interface Deal {
  id: string;
  show_id: string | null;
  show_title: string | null;    // denormalized
  network_id: string | null;
  network_name: string | null;  // denormalized
  buyer_id: string | null;
  buyer_name: string | null;    // denormalized
  prodco_id: string | null;
  prodco_name: string | null;   // denormalized
  deal_type: DealType;
  genre: string | null;
  format: string | null;
  deal_date: number | null;
  source: string | null;
  source_url: string | null;
  notes: string | null;
  created_at: number | null;
}

export interface IpProductionCompany {
  ip_id: string;
  prodco_id: string;
  // 'co_pro' = we're making it together; 'service' = they handle production; 'distribution' = they distribute
  relationship: string;
  notes: string | null;
}

// role_type values for buyer_contacts — distinguishes buyers from in-house staff
export type BuyerRoleType = 'buyer_exec' | 'staff_producer' | 'showrunner' | 'talent' | 'agent';

export interface BuyerEmployerHistory {
  id: string;
  contact_id: string;
  company_name: string;
  // 'network' | 'streamer' | 'cable' | 'prodco' | 'studio'
  company_type: string | null;
  title: string | null;
  // 1 if the title is a development/programming/acquisitions role (actual buying seat)
  is_buyer_seat: number;
  start_date: number | null;
  end_date: number | null;  // NULL = current position
  created_at: number | null;
}

// Triangulation row — buyer × prodco relationship strength, derived from deals table
export interface TriangulationRow {
  buyer_id: string;
  buyer_name: string;
  buyer_network: string | null;
  prodco_id: string;
  prodco_name: string;
  deal_count: number;
  last_deal_date: number | null;
  genres: string[];  // distinct genres across their deals together
  shows: string[];   // show titles
}

export interface ScraperRun {
  id: string;
  source: string;
  started_at: number | null;
  completed_at: number | null;
  status: string | null;
  items_found: number;
  error_msg: string | null;
}

export interface ScraperSourceStatus {
  source: string;
  display_name: string | null;
  enabled: number;
  last_run_at: number | null;
  last_success_at: number | null;
  last_items: number;
  consecutive_failures: number;
}

export interface IngestionLog {
  id: string;
  source_type: string | null;
  source_id: string | null;
  ingested_at: number | null;
  chunk_count: number | null;
  status: string | null;
}

// Scrapers return this shape; callers normalize into TradeArticle / Show / MarketOrder
export interface ScrapedArticle {
  url: string;
  headline: string;
  body: string;
  // 'greenlight' | 'order' | 'mandate' | 'market-news' | 'trade'
  item_type: string;
  source: string;
  scraped_at: number;
}

// Groq email classification response shape
export interface EmailClassification {
  pitch_related: boolean;
  package_id: string | null;
  signal: GrokSignal;
  meeting_date: string | null;
  pass_reason_quoted: string | null;
  deal_terms_mentioned: string | null;
  confidence: GrokConfidence;
}

// Full network (buyer_companies) detail with aggregated contacts, deals, and market orders.
// Returned by GET /api/networks/[id].
export interface NetworkDetail {
  id: string;
  name: string;
  type: string | null;
  tier: string | null;
  hq_city: string | null;
  notes: string | null;
  created_at: number | null;
  updated_at: number | null;
  // All buyer contacts at this company
  contacts: Array<{
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    activity_status: string;
    role_type: string | null;
    // 1 if current title is a development/acquisitions buying seat
    is_buyer_seat: number;
  }>;
  // Last 20 deals at this network, denormalized for display
  recent_deals: Array<{
    id: string;
    show_title: string | null;
    buyer_id: string | null;
    buyer_name: string | null;
    prodco_name: string | null;
    deal_date: number | null;
    deal_type: string | null;
    genre: string | null;
  }>;
  // Last 20 market orders linked to this network via buyer_company_id
  market_orders: Array<{
    id: string;
    show_title: string | null;
    order_date: number | null;
    genre: string | null;
    format: string | null;
    source: string | null;
  }>;
}

// LanceDB vector chunk shape — must match table schema exactly.
// Index signature required because LanceDB's add() expects Record<string, unknown>[].
export interface VectorChunk extends Record<string, unknown> {
  id: string;
  text: string;
  embedding: number[];
  source_type: string;
  source_id: string;
  source_name: string;
  date: string;
  buyer_company: string;
  buyer_contact: string;
  show_title: string;
  genre: string;
  item_type: string;
}

// Gmail message normalized from raw API response
export interface GmailMessage {
  id: string;
  threadId: string;
  subject: string;
  sender: string;
  recipient: string;
  body: string;
  receivedAt: number;
}

/**
 * PitchHub — fully assembled, denormalized view of a pitch package.
 * Returned by GET /api/pitches/[id]. Contains every data point needed to
 * render the Pitch Hub UI without follow-up requests.
 */
export interface PitchHub {
  // Core pitch (package)
  id: string;
  name: string;
  pipeline_stage: string;
  stage_entered_at: number | null;
  days_in_stage: number;
  status: string;
  narrative: string | null;
  ask_format: string | null;
  ask_episode_count: number | null;
  ask_deal_structure: string | null;
  created_at: number | null;
  updated_at: number | null;

  // The IP / Show being pitched
  ip: {
    id: string;
    title: string;
    logline: string | null;
    format: string | null;
    genre: string | null;
    subgenre: string | null;
    episode_count: number | null;
    status: string | null;
    rights_status: string | null;
    /** Source sheet: 'Priorities' | 'Backburner' | 'Passes' etc. */
    sheet_source: string | null;
    sheet_point_person: string | null;
    /** Comma-separated target network names from the tracking sheet */
    sheet_target_nets: string | null;
    /** Raw pass notes from tracking sheet */
    sheet_passed: string | null;
    sheet_pitched_to: string | null;
    sheet_next_steps: string | null;
    sheet_signed: string | null;
    notes: string | null;
  };

  // Target buyer — contact and company
  buyer: {
    contact_id: string | null;
    contact_name: string | null;
    contact_title: string | null;
    contact_email: string | null;
    contact_mandate: string | null;
    company_id: string | null;
    company_name: string | null;
    company_type: string | null;
    activity_status: string | null;
    last_greenlit_date: number | null;
    orders_last_90_days: number;
  };

  /**
   * Talent attached to this pitch — union of package_talent + ip_talent,
   * deduped by talent_id. 'package' source wins when the same person appears
   * in both.
   */
  talent: Array<{
    id: string;
    name: string;
    primary_role: string | null;
    mye_relationship: string | null;
    talent_tier: string | null;
    genre_fit: string | null;
    source: 'package' | 'ip';
  }>;

  /** Sizzle reels for this IP */
  sizzles: Array<{
    id: string;
    title: string | null;
    vimeo_url: string | null;
    vimeo_password: string | null;
    platform: string;
    raw_value: string | null;
    notes: string | null;
  }>;

  /** Pitch decks and supporting materials for this IP */
  decks: Array<{
    id: string;
    material_type: string;
    deck_url: string | null;
    raw_value: string | null;
    notes: string | null;
  }>;

  /** Comp shows parsed from comp_show_ids JSON array, joined to shows table */
  comp_shows: Array<{
    id: string;
    title: string;
    network: string | null;
    genre: string | null;
    format: string | null;
    episode_count: number | null;
    premiere_date: number | null;
  }>;

  /**
   * Project-level email threads from project_email_threads.
   * participants is deserialized from the JSON string stored in the DB.
   */
  project_threads: Array<{
    id: string;
    thread_id: string;
    subject: string | null;
    first_message_date: string | null;
    last_message_date: string | null;
    message_count: number;
    snippet: string | null;
    direction: string | null;
    participants: string[];
  }>;

  /** Package-level email signals — most recent 20, sorted by received_at DESC */
  package_emails: Array<{
    id: string;
    gmail_thread_id: string | null;
    subject: string | null;
    sender: string | null;
    received_at: number | null;
    grok_signal: string | null;
    stage_moved_to: string | null;
  }>;

  /** All historical pitches of this IP to any network, sorted newest first */
  pitch_history: Array<{
    id: string;
    buyer_company_name: string | null;
    buyer_contact_name: string | null;
    pitch_date: number | null;
    format_pitched: string | null;
    outcome: string | null;
    pass_reason: string | null;
    pass_reason_cat: string | null;
    notes: string | null;
  }>;

  /**
   * Other active packages for the same IP (excludes this package).
   * Shows where else this IP is being pitched simultaneously.
   */
  other_pitches: Array<{
    id: string;
    name: string;
    pipeline_stage: string;
    company_name: string | null;
    contact_name: string | null;
    days_in_stage: number;
  }>;

  /**
   * Deduplicated list of networks/companies this IP has been passed on.
   * Sourced from pitches.outcome='pass' and ip_catalog.sheet_passed.
   */
  networks_passed: string[];

  /** Dev tasks linked to this IP, sorted by deadline ASC (nulls last) */
  dev_tasks: Array<{
    id: string;
    task_description: string;
    assigned_to: string | null;
    deadline: string | null;
    section: string | null;
    status: string;
  }>;

  /**
   * Completeness score 0–100.
   * Used to render a readiness checklist in the Pitch Hub UI.
   * Each boolean = 1 pt; has_narrative and has_sizzle = 2 pts each (max 10).
   * score = (points / 10) * 100.
   */
  completeness: {
    score: number;
    has_narrative: boolean;
    has_sizzle: boolean;
    has_deck: boolean;
    has_talent: boolean;
    has_target_networks: boolean;
    has_email_activity: boolean;
    has_buyer: boolean;
    has_comp_shows: boolean;
  };
}
