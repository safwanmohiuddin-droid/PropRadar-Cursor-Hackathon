import {
  AppUser,
  Bid,
  Conversation,
  DealScore,
  DistressDeal,
  District,
  Investor,
  RelationshipInsight,
  WhatsAppMessage,
} from "./types";
import { dealQualityScore, distressScore, urgencyTier } from "./scoring";

/** Deterministic mock deal score — used when no ANTHROPIC_API_KEY is set or on error. */
export function mockScoreDeal(
  deal: Partial<DistressDeal>,
  district?: District,
): DealScore {
  const asking = deal.asking_price_aed ?? 0;
  const market = deal.market_value_aed ?? asking;
  const discount = deal.discount_pct ?? (market > 0 ? ((market - asking) / market) * 100 : 0);
  const urgency = deal.urgency_days ?? 30;
  const reason = deal.distress_reason ?? "relocation";
  const infra = district?.infrastructure_score ?? 75;

  const ds = distressScore({ discount_pct: discount, urgency_days: urgency, distress_reason: reason });
  const qs = dealQualityScore({
    market_discount_pct: discount,
    infrastructure_score: infra,
    asset_type: deal.asset_type ?? "apartment",
    urgency_days: urgency,
  });
  const tier = urgencyTier(urgency);

  const green: string[] = [];
  if (discount >= 15) green.push(`${discount.toFixed(1)}% discount vs market value`);
  if (urgency <= 30) green.push(`Hard ${urgency}-day deadline creates buyer leverage`);
  if (infra >= 80) green.push(`High district infrastructure score (${infra}/100)`);
  if (["foreclosure", "debt", "liquidation"].includes(reason))
    green.push("Forced-sale dynamics — limited competition");
  if (!green.length) green.push("Priced at or below district average");

  const red: string[] = [];
  if (urgency <= 14) red.push("Very short inspection / diligence window");
  if (reason === "probate") red.push("Probate paperwork may extend timeline");
  if (reason === "foreclosure" || reason === "debt")
    red.push("Encumbrance must be cleared at close");
  if (discount < 10) red.push("Discount is modest vs comparable distress deals");
  if (!red.length) red.push("Standard transfer and title checks apply");

  const slot = Math.min(8, Math.max(3, Math.round(3 + ds / 20)));
  const avg = district?.avg_price_sqm;
  const pps = deal.size_sqm ? Math.round(asking / deal.size_sqm) : 0;
  const priceVsMarket = avg
    ? `Priced at AED ${pps.toLocaleString()}/sqm vs ${district?.district} average of AED ${avg.toLocaleString()}/sqm.`
    : `Priced at AED ${pps.toLocaleString()}/sqm.`;

  return {
    distress_score: ds,
    deal_quality_score: qs,
    market_discount_pct: Math.round(discount * 10) / 10,
    urgency_tier: tier,
    ai_summary: `${reason[0].toUpperCase()}${reason.slice(1)}-driven sale in ${
      deal.district ?? "Abu Dhabi"
    }, priced ${discount.toFixed(1)}% below market. ${
      tier === "critical" || tier === "high"
        ? "Tight timeline creates genuine buyer leverage."
        : "Buyers have room to diligence before the deadline."
    }`,
    green_flags: green.slice(0, 4),
    red_flags: red.slice(0, 3),
    recommended_slot_count: slot,
    price_vs_market: priceVsMarket,
  };
}

export interface MatchResult {
  matches: {
    investor_id: string;
    investor_type: string;
    capital_range_aed: string;
    match_score: number;
    match_reasons: string[];
    risk_alignment: string;
    recommended_action: string;
  }[];
  allocation_strategy: string;
}

const SECTOR_FIT: Record<string, string[]> = {
  villa: ["residential"],
  apartment: ["residential"],
  townhouse: ["residential"],
  penthouse: ["residential"],
  plot: ["residential", "mixed_use"],
  land: ["residential", "mixed_use"],
  commercial: ["commercial", "mixed_use"],
  office: ["commercial", "mixed_use"],
  retail: ["commercial", "mixed_use"],
  hotel: ["hospitality"],
  warehouse: ["industrial", "logistics"],
};

export function preFilterInvestors(
  deal: DistressDeal,
  investors: Investor[],
): Investor[] {
  const fitSectors = SECTOR_FIT[deal.asset_type?.toLowerCase()] ?? [];
  const highDistress = deal.distress_score >= 75;
  const scored = investors
    .filter((inv) => inv.capital_max >= deal.asking_price_aed)
    .map((inv) => {
      let s = 0;
      if (fitSectors.includes(inv.preferred_sector) || inv.preferred_sector === "mixed_use") s += 40;
      if (inv.preferred_district === deal.district) s += 25;
      if (highDistress && inv.risk_profile === "aggressive") s += 15;
      if (!highDistress && inv.risk_profile === "balanced") s += 8;
      s += inv.relationship_score / 10;
      s += inv.strategic_fit_score / 20;
      return { inv, s };
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)
    .map((x) => x.inv);
  return scored;
}

export function mockMatchInvestors(
  deal: DistressDeal,
  investors: Investor[],
): MatchResult {
  const pre = preFilterInvestors(deal, investors);
  const fitSectors = SECTOR_FIT[deal.asset_type?.toLowerCase()] ?? [];
  const matches = pre.slice(0, 5).map((inv, idx) => {
    const sectorMatch = fitSectors.includes(inv.preferred_sector);
    const districtMatch = inv.preferred_district === deal.district;
    const score = Math.min(
      98,
      Math.round(
        62 +
          (sectorMatch ? 14 : 0) +
          (districtMatch ? 12 : 0) +
          inv.relationship_score / 12 +
          inv.strategic_fit_score / 25 -
          idx * 2,
      ),
    );
    const reasons: string[] = [];
    if (sectorMatch) reasons.push(`${inv.preferred_sector} mandate aligns with ${deal.asset_type}`);
    if (districtMatch) reasons.push(`${deal.district} is a preferred district`);
    reasons.push(`Capital range ${inv.capital_range_aed} covers the AED ${(deal.asking_price_aed / 1e6).toFixed(1)}M ticket`);
    if (inv.relationship_score >= 75) reasons.push("Strong relationship score & deal history");

    const action =
      score >= 85 ? "Contact immediately" : score >= 75 ? "Schedule call" : "Add to watchlist";
    return {
      investor_id: inv.investor_id,
      investor_type: inv.investor_type,
      capital_range_aed: inv.capital_range_aed,
      match_score: score,
      match_reasons: reasons.slice(0, 3),
      risk_alignment: `${inv.risk_profile[0].toUpperCase()}${inv.risk_profile.slice(1)} profile ${
        deal.distress_score >= 75 ? "suits this high-distress, fast-close deal." : "fits a measured distress play."
      }`,
      recommended_action: action,
    };
  });

  return {
    matches,
    allocation_strategy:
      "Lead with the top two matches for first-look access, then open remaining slots to the watchlist if no offer lands within 72 hours.",
  };
}

export interface BidEvaluation {
  legitimacy_score: number;
  legitimacy_verdict: "serious" | "conditional" | "suspicious" | "reject";
  legitimacy_note: string;
  bid_vs_market: string;
  recommendation: "Accept" | "Counter" | "Decline" | "Flag";
}

export function mockBidEvaluate(
  bid: Partial<Bid>,
  deal: DistressDeal,
  bidder?: AppUser,
): BidEvaluation {
  const amount = bid.amount_aed ?? 0;
  const asking = deal.asking_price_aed || 1;
  const ratio = amount / asking; // 1.0 == at asking
  const deltaPct = (ratio - 1) * 100;

  let score = 50;
  // Amount relative to asking is the strongest signal.
  if (ratio >= 1.0) score += 35;
  else if (ratio >= 0.97) score += 28;
  else if (ratio >= 0.92) score += 15;
  else if (ratio >= 0.85) score -= 5;
  else score -= 30;

  // Conditions & validity add seriousness.
  const cond = (bid.conditions ?? "").toLowerCase();
  if (cond.includes("cash")) score += 8;
  if (cond.includes("pre-approved") || cond.includes("preapproved")) score += 6;
  if (cond.length > 8) score += 3;
  if ((bid.validity_days ?? 14) <= 14) score += 4;

  // Bidder credibility.
  const cred = bidder?.credibility_score ?? bid.bidder_credibility ?? 50;
  score += (cred - 50) / 5;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const verdict: BidEvaluation["legitimacy_verdict"] =
    score >= 75 ? "serious" : score >= 55 ? "conditional" : score >= 40 ? "suspicious" : "reject";
  const recommendation: BidEvaluation["recommendation"] =
    score >= 75 ? "Accept" : score >= 55 ? "Counter" : score >= 40 ? "Flag" : "Decline";

  const note =
    score >= 75
      ? "Bid near or above asking with credible terms — proceed with confidence."
      : score >= 55
        ? "Reasonable bid but below asking or lightly conditioned — consider a counter."
        : score >= 40
          ? "Below-market or weakly supported bid — verify intent before engaging."
          : "Lowball with little supporting detail — below the serious-buyer threshold.";

  return {
    legitimacy_score: score,
    legitimacy_verdict: verdict,
    legitimacy_note: note,
    bid_vs_market: `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}% vs asking price`,
    recommendation,
  };
}

const POSITIVE = [
  "interested",
  "great",
  "perfect",
  "confirmed",
  "confirm",
  "cash",
  "pre-approved",
  "ready",
  "fast",
  "close",
  "view",
  "viewing",
  "proceed",
  "bid",
  "offer",
  "clean",
  "yes",
  "love",
  "appreciated",
];
const NEGATIVE = [
  "too high",
  "expensive",
  "reconsider",
  "not sure",
  "slow",
  "delay",
  "longer",
  "problem",
  "concern",
  "high for",
  "revert",
  "later",
  "busy",
  "unfortunately",
];

/**
 * Deterministic relationship-management insight from a WhatsApp thread.
 * Used when no ANTHROPIC_API_KEY is set or on error.
 */
export function mockRelationshipInsight(
  messages: WhatsAppMessage[],
  conversation?: Pick<Conversation, "participant_name" | "participant_role">,
): RelationshipInsight {
  const text = messages.map((m) => m.text.toLowerCase()).join(" ");
  const pos = POSITIVE.filter((w) => text.includes(w)).length;
  const neg = NEGATIVE.filter((w) => text.includes(w)).length;

  const participantMsgs = messages.filter((m) => m.sender_role !== "seller");
  const sellerMsgs = messages.filter((m) => m.sender_role === "seller");
  const balanced = participantMsgs.length > 0 && sellerMsgs.length > 0;

  // Recency: hours since last message.
  const last = messages.length ? new Date(messages[messages.length - 1].timestamp).getTime() : 0;
  const hoursSince = last ? (Date.now() - last) / 3600000 : 999;

  let health = 50 + pos * 7 - neg * 11;
  if (balanced) health += 8;
  if (messages.length >= 5) health += 6;
  if (hoursSince < 24) health += 8;
  else if (hoursSince > 72) health -= 10;
  health = Math.max(0, Math.min(100, Math.round(health)));

  const sentiment: RelationshipInsight["sentiment"] =
    pos - neg >= 2 ? "positive" : neg - pos >= 1 ? "negative" : "neutral";
  const engagement_level: RelationshipInsight["engagement_level"] =
    messages.length >= 5 && hoursSince < 48 ? "high" : messages.length >= 3 ? "medium" : "low";

  const intent: string[] = [];
  if (text.includes("cash")) intent.push("Mentioned cash settlement");
  if (text.includes("view")) intent.push("Requested or agreed a viewing");
  if (text.includes("pre-approved") || text.includes("financing")) intent.push("Financing already in place");
  if (text.includes("bid") || text.includes("offer")) intent.push("Signalled intent to bid");
  if (text.includes("assign") || text.includes("transfer")) intent.push("Asked about off-plan assignment");
  if (!intent.length) intent.push("Early-stage interest, no firm commitment yet");

  const risks: string[] = [];
  if (neg > 0 && (text.includes("too high") || text.includes("high for"))) risks.push("Raised price concerns");
  if (text.includes("slow") || text.includes("longer") || text.includes("delay"))
    risks.push("Timeline misalignment — may be too slow to close");
  if (text.includes("reconsider") || text.includes("revert")) risks.push("Cooling interest — non-committal language");
  if (hoursSince > 72) risks.push(`No reply for ${Math.round(hoursSince / 24)} days`);
  if (!risks.length) risks.push("No material risks detected");

  const recommended_action =
    health >= 70
      ? "Prioritise — push to a formal offer while momentum is high."
      : health >= 45
        ? "Nurture — address the open concern and propose a concrete next step."
        : "Re-engage — interest is fading; offer flexibility or move to the next buyer.";

  const who = conversation?.participant_name ?? "Participant";
  const summary =
    sentiment === "positive"
      ? `${who} is engaged and moving toward a deal — ${intent[0].toLowerCase()}.`
      : sentiment === "negative"
        ? `${who} shows hesitation — ${risks[0].toLowerCase()}.`
        : `${who} is in active dialogue with mixed signals; clarify the next step.`;

  return {
    health_score: health,
    sentiment,
    engagement_level,
    intent_signals: intent.slice(0, 4),
    risks: risks.slice(0, 3),
    recommended_action,
    summary,
  };
}
