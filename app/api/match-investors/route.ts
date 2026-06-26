import { NextRequest, NextResponse } from "next/server";
import { callClaudeJson } from "@/lib/anthropic";
import { mockMatchInvestors, preFilterInvestors, type MatchResult } from "@/lib/mock";
import type { DistressDeal, District, Investor } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let deal: DistressDeal | undefined;
  let investors: Investor[] = [];
  let district: District | undefined;
  try {
    const body = await req.json();
    deal = body.deal;
    investors = body.investors ?? [];
    district = body.district;
  } catch {
    // ignore
  }

  if (!deal) {
    return NextResponse.json({ matches: [], allocation_strategy: "", source: "mock" });
  }

  const fallback = mockMatchInvestors(deal, investors);
  const pre = preFilterInvestors(deal, investors);

  const system =
    "You are a UAE real estate investment matchmaker. Rank the provided pre-filtered investors against this distressed deal using mandate, capital, district and risk alignment. Be specific per investor. Respond with JSON only.";
  const user = JSON.stringify({
    deal: {
      title: deal.title,
      district: deal.district,
      asset_type: deal.asset_type,
      asking_price_aed: deal.asking_price_aed,
      distress_score: deal.distress_score,
      deal_quality_score: deal.deal_quality_score,
      distress_reason: deal.distress_reason,
    },
    district_context: district
      ? { profile: district.profile, gross_yield_pct: district.gross_yield_pct, avg_price_sqm: district.avg_price_sqm }
      : null,
    investors: pre.map((i) => ({
      investor_id: i.investor_id,
      investor_type: i.investor_type,
      preferred_sector: i.preferred_sector,
      preferred_district: i.preferred_district,
      capital_range_aed: i.capital_range_aed,
      risk_profile: i.risk_profile,
      investment_horizon: i.investment_horizon,
      relationship_score: i.relationship_score,
      strategic_fit_score: i.strategic_fit_score,
    })),
    return_schema: {
      matches: [
        {
          investor_id: "INV-XXX",
          investor_type: "...",
          capital_range_aed: "...",
          match_score: "0-100",
          match_reasons: ["specific reason 1", "specific reason 2"],
          risk_alignment: "one sentence",
          recommended_action: "Contact immediately|Schedule call|Add to watchlist",
        },
      ],
      allocation_strategy: "one sentence on how to sequence these investors",
    },
    instructions: "Return the top 5 matches only.",
  });

  try {
    const ai = await callClaudeJson<MatchResult>(system, user);
    if (ai && Array.isArray(ai.matches) && ai.matches.length) {
      return NextResponse.json({
        matches: ai.matches.slice(0, 5),
        allocation_strategy: ai.allocation_strategy ?? fallback.allocation_strategy,
        source: "ai",
      });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[match-investors] error:", err);
  }
  return NextResponse.json({ ...fallback, source: "mock" });
}
