export type UserRole = "seller" | "investor" | "buyer";

export type Tier = "bronze" | "silver" | "gold" | "platinum";

export interface AppUser {
  id: string;
  role: UserRole;
  name: string;
  avatar_initials: string;
  credibility_score: number;
  deals_completed: number;
  deals_failed: number;
  tier: Tier;
  joined_date: string;
  verification_level?: "unverified" | "basic" | "full";
  phone?: string; // WhatsApp number (E.164, e.g. +9715...)
}

export type CompletionStatus = "off_plan" | "ready";

export interface Investor {
  investor_id: string;
  investor_type: string;
  preferred_sector: string;
  preferred_district: string;
  capital_range_aed: string;
  capital_min: number;
  capital_max: number;
  risk_profile: string;
  investment_horizon: string;
  strategic_fit_score: number;
  relationship_score: number;
  portfolio_size_aed: number;
  deals_closed: number;
  response_rate: number;
  avg_deal_time_days: number;
}

export type DealStatus =
  | "pending_review"
  | "ai_scoring"
  | "matched"
  | "bidding"
  | "under_offer"
  | "closed"
  | "withdrawn";

export type ChainStatus = "unverified" | "verified" | "on_chain";

export interface InvestorMatch {
  investor_id: string;
  investor_type: string;
  capital_range_aed: string;
  match_score: number;
  match_reasons: string[];
  risk_alignment: string;
  recommended_action: string;
}

export type BidStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn"
  | "expired";

export interface Bid {
  id: string;
  deal_id: string;
  bidder_id: string;
  bidder_name: string;
  bidder_tier: string;
  bidder_credibility: number;
  amount_aed: number;
  conditions: string;
  validity_days: number;
  status: BidStatus;
  ai_legitimacy_score: number;
  ai_legitimacy_note: string;
  submitted_at: string;
}

export interface DistressDeal {
  id: string;
  seller_id: string;
  title: string;
  district: string;
  asset_type: string;
  bedrooms: number | null;
  size_sqm: number;
  asking_price_aed: number;
  market_value_aed: number;
  discount_pct: number;
  distress_reason: string;
  urgency_days: number;
  description: string;
  status: DealStatus;
  distress_score: number;
  deal_quality_score: number;
  ai_summary: string;
  ai_red_flags: string[];
  ai_green_flags: string[];
  matched_investors: InvestorMatch[];
  bids: Bid[];
  bid_slots: number;
  bid_deadline: string;
  chain_hash: string;
  chain_status: ChainStatus;
  created_at: string;
  views: number;
  latitude: number;
  longitude: number;
  // Off-plan attributes (the marketplace is primarily off-plan distress).
  completion_status: CompletionStatus;
  developer?: string;
  handover_date?: string | null;
  payment_plan?: string; // e.g. "60/40 on handover"
  paid_pct?: number; // % of the payment plan already paid by the seller
}

export interface DealScore {
  distress_score: number;
  deal_quality_score: number;
  market_discount_pct: number;
  urgency_tier: "critical" | "high" | "moderate" | "low";
  ai_summary: string;
  green_flags: string[];
  red_flags: string[];
  recommended_slot_count: number;
  price_vs_market: string;
}

export interface District {
  district: string;
  area_type: string;
  profile: string;
  base_sale_aed_sqm: number;
  gross_yield_pct: number;
  infrastructure_score: number;
  latitude: number;
  longitude: number;
  avg_price_sqm: number;
  transaction_count: number;
  gap_score: number;
}

export interface Listing {
  listing_id: string;
  district: string;
  community: string;
  listing_type: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  price_aed: number;
  price_per_sqm_aed: number;
  latitude: number;
  longitude: number;
  status: string;
}

export interface Transaction {
  transaction_id: string;
  date: string;
  district: string;
  asset_type: string;
  transaction_value_aed: number;
  size_sqm: number;
  price_per_sqm: number;
  buyer_type: string;
}

export interface Parcel {
  parcel_id: string;
  district: string;
  zone: string;
  land_use: string;
  parcel_size_sqm: number;
  current_status: string;
  infrastructure_score: number;
  development_potential_score: number;
  estimated_value_aed: number;
  recommended_use: string;
}

export interface QuarterPoint {
  quarter: string;
  price: number;
}

export interface MarketData {
  // Per-district quarterly avg price/sqm series (last 8 quarters)
  seriesByDistrict: Record<string, QuarterPoint[]>;
  // Overall quarterly avg price/sqm series
  overallSeries: QuarterPoint[];
  // Volume by asset type
  assetVolume: { asset_type: string; count: number }[];
  // Active listing counts per district
  listingCountByDistrict: Record<string, number>;
}

export interface ServerData {
  districts: District[];
  investors: Investor[];
  market: MarketData;
}

// ---- WhatsApp communication + AI relationship management ----

export type ChatRole = "seller" | "investor" | "buyer";

export interface WhatsAppMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_role: ChatRole;
  text: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  deal_id: string;
  deal_title: string;
  // The non-seller participant (a buyer or investor) talking to the seller.
  participant_id: string;
  participant_name: string;
  participant_role: ChatRole;
  participant_phone: string;
  seller_id: string;
  seller_name: string;
  messages: WhatsAppMessage[];
}

export interface RelationshipInsight {
  health_score: number; // 0-100 relationship health
  sentiment: "positive" | "neutral" | "negative";
  engagement_level: "high" | "medium" | "low";
  intent_signals: string[];
  risks: string[];
  recommended_action: string;
  summary: string;
}
