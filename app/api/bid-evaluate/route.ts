import { NextRequest, NextResponse } from "next/server";
import { callClaudeJson } from "@/lib/anthropic";
import { mockBidEvaluate, type BidEvaluation } from "@/lib/mock";
import type { AppUser, Bid, DistressDeal } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let bid: Partial<Bid> = {};
  let deal: DistressDeal | undefined;
  let bidder: AppUser | undefined;
  try {
    const body = await req.json();
    bid = body.bid ?? {};
    deal = body.deal;
    bidder = body.bidder;
  } catch {
    // ignore
  }

  if (!deal) {
    return NextResponse.json({
      legitimacy_score: 50,
      legitimacy_verdict: "conditional",
      legitimacy_note: "Insufficient deal context.",
      bid_vs_market: "0%",
      recommendation: "Flag",
      source: "mock",
    });
  }

  const fallback = mockBidEvaluate(bid, deal, bidder);

  const system =
    "You are a UAE real estate bid-integrity analyst. Evaluate how serious and legitimate this bid is given the deal, the bid terms, and the bidder's history. Respond with JSON only.";
  const user = JSON.stringify({
    deal: {
      title: deal.title,
      asking_price_aed: deal.asking_price_aed,
      market_value_aed: deal.market_value_aed,
      district: deal.district,
      asset_type: deal.asset_type,
    },
    bid: {
      amount_aed: bid.amount_aed,
      conditions: bid.conditions,
      validity_days: bid.validity_days,
    },
    bidder: bidder
      ? {
          tier: bidder.tier,
          credibility_score: bidder.credibility_score,
          deals_completed: bidder.deals_completed,
          deals_failed: bidder.deals_failed,
        }
      : null,
    return_schema: {
      legitimacy_score: "0-100",
      legitimacy_verdict: "serious|conditional|suspicious|reject",
      legitimacy_note: "one sentence explanation",
      bid_vs_market: "percentage above or below asking",
      recommendation: "Accept|Counter|Decline|Flag",
    },
  });

  try {
    const ai = await callClaudeJson<BidEvaluation>(system, user);
    if (ai && typeof ai.legitimacy_score === "number") {
      return NextResponse.json({ ...fallback, ...ai, source: "ai" });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[bid-evaluate] error:", err);
  }
  return NextResponse.json({ ...fallback, source: "mock" });
}
