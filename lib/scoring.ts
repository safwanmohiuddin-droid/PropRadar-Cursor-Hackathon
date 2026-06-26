import type { Bid, Tier } from "./types";

export function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

/** Normalize a value to 0-1 within [min,max]. Safe against zero-range. */
export function normalize(value: number, min: number, max: number): number {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

const HORIZON_SCORE: Record<string, number> = {
  short: 0.3,
  medium: 0.6,
  long: 1.0,
};

/**
 * Investor Relationship Score (0-100). Several inputs are normalized across
 * the full investor set, so callers pass the population min/max.
 */
export function relationshipScore(args: {
  portfolio_size_aed: number;
  deals_closed: number;
  response_rate: number; // 0-1
  investment_horizon: string;
  strategic_fit_score: number; // 0-100
  portfolioRange: [number, number];
  dealsRange: [number, number];
}): number {
  const portfolioN = normalize(args.portfolio_size_aed, args.portfolioRange[0], args.portfolioRange[1]);
  const dealsN = normalize(args.deals_closed, args.dealsRange[0], args.dealsRange[1]);
  const horizon = HORIZON_SCORE[args.investment_horizon] ?? 0.6;
  const score =
    portfolioN * 20 +
    dealsN * 25 +
    args.response_rate * 20 +
    horizon * 15 +
    (args.strategic_fit_score / 100) * 20;
  return Math.round(clamp(score));
}

/** Buyer Credibility Score (0-100). */
export function credibilityScore(args: {
  deals_completed: number;
  deals_failed: number;
  account_age_days: number;
  verification_level: "unverified" | "basic" | "full";
  bid_quality_avg: number; // 0-100 avg ai_legitimacy of past bids
}): number {
  const completedPts = Math.min(args.deals_completed * 8, 40);
  const failedPts = args.deals_failed * -15;
  const agePts = Math.min(args.account_age_days * 0.1, 20);
  const verifyPts = { unverified: 0, basic: 10, full: 20 }[args.verification_level];
  const bidQualityPts = Math.min((args.bid_quality_avg / 100) * 20, 20);
  return Math.round(clamp(completedPts + failedPts + agePts + verifyPts + bidQualityPts));
}

export function tierForScore(score: number): Tier {
  if (score >= 75) return "platinum";
  if (score >= 50) return "gold";
  if (score >= 25) return "silver";
  return "bronze";
}

export interface TierRule {
  tier: Tier;
  label: string;
  canBid: boolean;
  description: string;
  maxSlots: number | "any";
}

export const TIER_RULES: Record<Tier, TierRule> = {
  bronze: {
    tier: "bronze",
    label: "Bronze",
    canBid: false,
    description: "Can view deals only — cannot bid yet.",
    maxSlots: 0,
  },
  silver: {
    tier: "silver",
    label: "Silver",
    canBid: true,
    description: "Can bid on up to 2 open slots per deal.",
    maxSlots: 2,
  },
  gold: {
    tier: "gold",
    label: "Gold",
    canBid: true,
    description: "Can bid on any open slot, with early access.",
    maxSlots: "any",
  },
  platinum: {
    tier: "platinum",
    label: "Platinum",
    canBid: true,
    description: "Exclusive pre-public access, 1 reserved slot per deal.",
    maxSlots: "any",
  },
};

/** Points needed to reach the next tier, and the next tier label. */
export function nextTierProgress(score: number): {
  next: Tier | null;
  pointsNeeded: number;
  floor: number;
  ceil: number;
} {
  if (score < 25) return { next: "silver", pointsNeeded: 25 - score, floor: 0, ceil: 25 };
  if (score < 50) return { next: "gold", pointsNeeded: 50 - score, floor: 25, ceil: 50 };
  if (score < 75) return { next: "platinum", pointsNeeded: 75 - score, floor: 50, ceil: 75 };
  return { next: null, pointsNeeded: 0, floor: 75, ceil: 100 };
}

const DISTRESS_REASON_PTS: Record<string, number> = {
  foreclosure: 20,
  debt: 20,
  liquidation: 15,
  probate: 10,
  divorce: 10,
  relocation: 5,
};

/** Deal Distress Score (0-100). */
export function distressScore(args: {
  discount_pct: number;
  urgency_days: number;
  distress_reason: string;
}): number {
  let pts = 0;
  // discount
  if (args.discount_pct > 30) pts += 50;
  else if (args.discount_pct > 20) pts += 40;
  else if (args.discount_pct > 10) pts += 25;
  else pts += 10;
  // urgency
  if (args.urgency_days < 7) pts += 30;
  else if (args.urgency_days < 30) pts += 20;
  else if (args.urgency_days < 90) pts += 10;
  else pts += 5;
  // reason
  pts += DISTRESS_REASON_PTS[args.distress_reason?.toLowerCase()] ?? 5;
  return Math.round(clamp(pts));
}

// Asset-type weighting for "quality" — premium assets carry more weight.
const ASSET_PREMIUM: Record<string, number> = {
  villa: 1.0,
  plot: 0.95,
  townhouse: 0.85,
  apartment: 0.8,
  penthouse: 0.95,
  commercial: 0.75,
  office: 0.75,
  hotel: 0.85,
  retail: 0.7,
  warehouse: 0.5,
  land: 0.9,
};

/** Deal Quality Score (0-100). */
export function dealQualityScore(args: {
  market_discount_pct: number;
  infrastructure_score: number; // 0-100
  asset_type: string;
  urgency_days: number;
}): number {
  const discountN = clamp(args.market_discount_pct / 40, 0, 1); // 40% discount = max
  const infraN = clamp(args.infrastructure_score / 100, 0, 1);
  const assetN = ASSET_PREMIUM[args.asset_type?.toLowerCase()] ?? 0.7;
  // Higher urgency => more buyer leverage => higher quality-for-buyer.
  const urgencyN = clamp(1 - args.urgency_days / 120, 0, 1);
  const score =
    discountN * 35 + infraN * 20 + assetN * 15 + urgencyN * 30;
  return Math.round(clamp(score));
}

export function urgencyTier(days: number): "critical" | "high" | "moderate" | "low" {
  if (days < 7) return "critical";
  if (days < 21) return "high";
  if (days < 60) return "moderate";
  return "low";
}

/** Average legitimacy across a bidder's historical bids (0-100). */
export function avgBidQuality(bids: Bid[]): number {
  if (!bids.length) return 50; // neutral prior
  const sum = bids.reduce((a, b) => a + (b.ai_legitimacy_score || 0), 0);
  return Math.round(sum / bids.length);
}
