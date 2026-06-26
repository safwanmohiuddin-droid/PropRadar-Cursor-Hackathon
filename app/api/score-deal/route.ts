import { NextRequest, NextResponse } from "next/server";
import { callClaudeJson } from "@/lib/anthropic";
import { mockScoreDeal } from "@/lib/mock";
import type { DealScore, DistressDeal, District } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let deal: Partial<DistressDeal> = {};
  let district: District | undefined;
  try {
    const body = await req.json();
    deal = body.deal ?? {};
    district = body.district;
  } catch {
    // ignore — fall through to mock with empty deal
  }

  const fallback = mockScoreDeal(deal, district);

  const system =
    "You are a UAE real estate distressed asset analyst. Score this deal with precision. Base your market analysis on the district data provided. Be specific and data-driven. Respond with JSON only.";
  const user = JSON.stringify({
    deal: {
      title: deal.title,
      district: deal.district,
      asset_type: deal.asset_type,
      bedrooms: deal.bedrooms,
      size_sqm: deal.size_sqm,
      asking_price_aed: deal.asking_price_aed,
      market_value_aed: deal.market_value_aed,
      discount_pct: deal.discount_pct,
      distress_reason: deal.distress_reason,
      urgency_days: deal.urgency_days,
      description: deal.description,
    },
    district_context: district
      ? {
          district: district.district,
          profile: district.profile,
          avg_price_per_sqm_aed: district.avg_price_sqm,
          base_sale_aed_sqm: district.base_sale_aed_sqm,
          gross_yield_pct: district.gross_yield_pct,
          infrastructure_score: district.infrastructure_score,
          transaction_count: district.transaction_count,
        }
      : null,
    return_schema: {
      distress_score: "0-100",
      deal_quality_score: "0-100",
      urgency_tier: "critical|high|moderate|low",
      market_discount_pct: "number",
      ai_summary: "2 sentences max, specific to the data",
      green_flags: ["max 4 specific positive signals"],
      red_flags: ["max 3 specific risk flags"],
      recommended_slot_count: "3-8",
      price_vs_market: "one sentence comparing to district average",
    },
  });

  try {
    const ai = await callClaudeJson<DealScore>(system, user);
    if (ai && typeof ai.distress_score === "number") {
      return NextResponse.json({ ...fallback, ...ai, source: "ai" });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[score-deal] error:", err);
  }
  return NextResponse.json({ ...fallback, source: "mock" });
}
