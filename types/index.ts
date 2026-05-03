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
  created_at: number | null;
  updated_at: number | null;
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
