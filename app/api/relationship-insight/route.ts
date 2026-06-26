import { NextRequest, NextResponse } from "next/server";
import { callClaudeJson } from "@/lib/anthropic";
import { mockRelationshipInsight } from "@/lib/mock";
import type { Conversation, DistressDeal, RelationshipInsight } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  let conversation: Conversation | undefined;
  let deal: DistressDeal | undefined;
  try {
    const body = await req.json();
    conversation = body.conversation;
    deal = body.deal;
  } catch {
    // ignore
  }

  const messages = conversation?.messages ?? [];
  const fallback = mockRelationshipInsight(messages, conversation);

  const system =
    "You are an AI relationship manager for a UAE off-plan distressed-property marketplace. Read this WhatsApp thread between a seller and a buyer/investor and assess the relationship and deal momentum. Respond with JSON only.";
  const user = JSON.stringify({
    deal: deal
      ? { title: deal.title, asking_price_aed: deal.asking_price_aed, completion_status: deal.completion_status, urgency_days: deal.urgency_days }
      : null,
    participant: conversation
      ? { name: conversation.participant_name, role: conversation.participant_role }
      : null,
    thread: messages.map((m) => ({ role: m.sender_role, name: m.sender_name, text: m.text, at: m.timestamp })),
    return_schema: {
      health_score: "0-100 relationship health",
      sentiment: "positive|neutral|negative",
      engagement_level: "high|medium|low",
      intent_signals: ["max 4 concrete buying-intent signals"],
      risks: ["max 3 relationship/deal risks"],
      recommended_action: "one sentence next best action",
      summary: "one sentence relationship summary",
    },
  });

  try {
    const ai = await callClaudeJson<RelationshipInsight>(system, user);
    if (ai && typeof ai.health_score === "number") {
      return NextResponse.json({ ...fallback, ...ai, source: "ai" });
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[relationship-insight] error:", err);
  }
  return NextResponse.json({ ...fallback, source: "mock" });
}
