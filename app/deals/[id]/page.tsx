"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { ChatRole, Conversation, DealScore, DistressDeal, InvestorMatch } from "@/lib/types";
import { formatAED, formatPct, daysUntil, shortHash } from "@/lib/format";
import { cn, distressSeverity, STATUS_BADGE, STATUS_LABEL, urgencyColor } from "@/lib/ui";
import Badge from "@/components/ui/Badge";
import DealScoreCard from "@/components/deals/DealScoreCard";
import MatchCard from "@/components/investors/MatchCard";
import DealTimeline from "@/components/deals/DealTimeline";
import BiddingRoom from "@/components/deals/BiddingRoom";
import EmptyState from "@/components/ui/EmptyState";
import { PriceLineChart } from "@/components/analytics/MarketChart";
import { FadeUp } from "@/components/ui/Motion";
import WhatsAppThread from "@/components/messaging/WhatsAppThread";
import RelationshipPanel from "@/components/messaging/RelationshipPanel";

function toScore(deal: DistressDeal): DealScore {
  return {
    distress_score: deal.distress_score,
    deal_quality_score: deal.deal_quality_score,
    market_discount_pct: deal.discount_pct,
    urgency_tier:
      deal.urgency_days < 7 ? "critical" : deal.urgency_days < 21 ? "high" : deal.urgency_days < 60 ? "moderate" : "low",
    ai_summary: deal.ai_summary,
    green_flags: deal.ai_green_flags,
    red_flags: deal.ai_red_flags,
    recommended_slot_count: deal.bid_slots,
    price_vs_market: "",
  };
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const deal = useStore((s) => s.deals.find((d) => d.id === params.id));
  const districts = useStore((s) => s.districts);
  const market = useStore((s) => s.market);
  const investors = useStore((s) => s.investors);
  const user = useStore((s) => s.users[s.currentUserId]);
  const users = useStore((s) => s.users);
  const updateDeal = useStore((s) => s.updateDeal);
  const allConversations = useStore((s) => s.conversations);
  const addConversation = useStore((s) => s.addConversation);

  const [showAllMatches, setShowAllMatches] = useState(false);
  const [running, setRunning] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);

  const dealConversations = useMemo(
    () => allConversations.filter((c) => c.deal_id === params.id),
    [allConversations, params.id],
  );
  const activeConv =
    dealConversations.find((c) => c.id === activeConvId) ?? dealConversations[0];

  const district = useMemo(
    () => districts.find((d) => d.district === deal?.district),
    [districts, deal?.district],
  );

  if (!deal) {
    return (
      <EmptyState icon="🗺️" title="Deal not found" description="It may have been withdrawn." ctaLabel="Back to deals" ctaHref="/deals" />
    );
  }

  const sev = distressSeverity(deal.distress_score);
  const days = daysUntil(deal.bid_deadline);
  const series = market?.seriesByDistrict[deal.district] ?? [];
  const listingCount = market?.listingCountByDistrict[deal.district] ?? 0;
  const askPerSqm = deal.size_sqm ? Math.round(deal.asking_price_aed / deal.size_sqm) : 0;
  const avgPerSqm = district?.avg_price_sqm ?? 0;
  const score = toScore(deal);
  const matchesToShow = showAllMatches ? deal.matched_investors : deal.matched_investors.slice(0, 3);

  async function runAi() {
    if (!deal) return;
    setRunning(true);
    try {
      const [scoreRes, matchRes] = await Promise.all([
        fetch("/api/score-deal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal, district }),
        }).then((r) => r.json()),
        fetch("/api/match-investors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deal, investors, district }),
        }).then((r) => r.json()),
      ]);
      const matched: InvestorMatch[] = (matchRes.matches ?? []).map((m: InvestorMatch) => m);
      updateDeal(deal.id, {
        distress_score: scoreRes.distress_score ?? deal.distress_score,
        deal_quality_score: scoreRes.deal_quality_score ?? deal.deal_quality_score,
        ai_summary: scoreRes.ai_summary ?? deal.ai_summary,
        ai_green_flags: scoreRes.green_flags ?? [],
        ai_red_flags: scoreRes.red_flags ?? [],
        matched_investors: matched,
        status: "bidding",
        chain_status: "verified",
      });
      toast.success("AI scoring complete — investors matched.");
    } catch {
      toast.error("Scoring failed — please retry.");
    } finally {
      setRunning(false);
    }
  }

  const myConv = user ? dealConversations.find((c) => c.participant_id === user.id) : undefined;
  const canConnect = !!user && user.role !== "seller" && !myConv;

  function startConversation() {
    if (!user || !deal) return;
    const sellerName = users[deal.seller_id]?.name ?? "Seller";
    const conv: Conversation = {
      id: `CONV-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      deal_id: deal.id,
      deal_title: deal.title,
      participant_id: user.id,
      participant_name: user.name,
      participant_role: user.role as ChatRole,
      participant_phone: user.phone ?? "+9715XXXXXXXX",
      seller_id: deal.seller_id,
      seller_name: sellerName,
      messages: [
        {
          id: `M-${Math.random().toString(36).slice(2, 8)}`,
          sender_id: user.id,
          sender_name: user.name,
          sender_role: user.role as ChatRole,
          text: `Hi, I'm interested in ${deal.title}. Is it still available?`,
          timestamp: new Date().toISOString(),
        },
      ],
    };
    addConversation(conv);
    setActiveConvId(conv.id);
    toast.success("WhatsApp conversation started with the seller.");
  }

  return (
    <div className="space-y-6">
      <Link href="/deals" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← All deals
      </Link>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        {/* LEFT — Deal Intelligence */}
        <div className="space-y-6 lg:col-span-3">
          <FadeUp>
            <div className="card p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={sev.badge}>{sev.label}</Badge>
                <Badge className={STATUS_BADGE[deal.status]}>{STATUS_LABEL[deal.status]}</Badge>
                <Badge>{deal.district}</Badge>
                <Badge className="capitalize">{deal.asset_type}</Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold text-zinc-50">{deal.title}</h1>
              <p className="mt-2 text-sm text-zinc-400">{deal.description}</p>

              <div className="mt-4 flex flex-wrap items-end gap-x-8 gap-y-3">
                <div>
                  <p className="font-mono text-3xl font-bold text-zinc-50">{formatAED(deal.asking_price_aed)}</p>
                  <p className="text-sm text-emerald-400">{formatPct(deal.discount_pct)} below market</p>
                </div>
                <div className={cn("flex items-center gap-2 text-sm", urgencyColor(days))}>
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current" />
                  {days} days left
                </div>
                <div className="text-xs text-zinc-500">
                  Market value <span className="font-mono text-zinc-300">{formatAED(deal.market_value_aed)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 sm:grid-cols-4">
                <OffPlanFact label="Completion" value={deal.completion_status === "off_plan" ? "Off-plan" : "Ready"} />
                {deal.developer && <OffPlanFact label="Developer" value={deal.developer} />}
                <OffPlanFact
                  label="Handover"
                  value={deal.handover_date ? new Date(deal.handover_date).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"}
                />
                {deal.payment_plan && <OffPlanFact label="Payment plan" value={deal.payment_plan} />}
                {deal.paid_pct != null && <OffPlanFact label="Paid to date" value={`${deal.paid_pct}%`} />}
              </div>
            </div>
          </FadeUp>

          {deal.status === "ai_scoring" ? (
            <FadeUp>
              <div className="card flex flex-col items-center gap-3 p-8 text-center">
                <div className="text-3xl">🤖</div>
                <p className="text-sm text-zinc-300">This deal is awaiting AI analysis.</p>
                <p className="max-w-sm text-xs text-zinc-500">
                  Claude will analyze it against 5,000 Abu Dhabi transactions and match it to aligned investors.
                </p>
                <button onClick={runAi} disabled={running} className="btn-primary mt-2">
                  {running ? "Analyzing…" : "Run AI Scoring"}
                </button>
              </div>
            </FadeUp>
          ) : (
            <FadeUp>
              <DealScoreCard
                score={score}
                marketAsk={askPerSqm}
                marketLow={Math.round(avgPerSqm * 0.7)}
                marketHigh={Math.round(avgPerSqm * 1.3)}
              />
            </FadeUp>
          )}

          {/* Market context */}
          <FadeUp>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-zinc-200">Market Context — {deal.district}</h3>
              {series.length ? (
                <div className="mt-3">
                  <PriceLineChart data={series} />
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">No transaction history for this district.</p>
              )}
              <p className="mt-3 text-sm text-zinc-400">
                This deal is priced at <span className="font-mono text-zinc-100">AED {askPerSqm.toLocaleString()}/sqm</span>{" "}
                vs the {deal.district} average of{" "}
                <span className="font-mono text-zinc-100">AED {avgPerSqm.toLocaleString()}/sqm</span>.
              </p>
              <p className="text-xs text-zinc-500">{listingCount} comparable active listings in this district.</p>
            </div>
          </FadeUp>

          {/* Matched investors */}
          <FadeUp>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-zinc-200">AI Recommended Investors</h3>
              {deal.matched_investors.length ? (
                <>
                  <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {matchesToShow.map((m) => (
                      <MatchCard key={m.investor_id} match={m} />
                    ))}
                  </div>
                  {deal.matched_investors.length > 3 && (
                    <button
                      onClick={() => setShowAllMatches((v) => !v)}
                      className="btn-ghost mt-3 w-full border border-line text-xs"
                    >
                      {showAllMatches ? "Show fewer" : `View all ${deal.matched_investors.length} matches`}
                    </button>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">Matches will appear once AI scoring runs.</p>
              )}
            </div>
          </FadeUp>

          {/* Conversations & AI relationship management */}
          <FadeUp>
            <div className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-zinc-200">💬 Conversations</h3>
                {canConnect ? (
                  <button
                    onClick={startConversation}
                    className="flex items-center gap-1.5 rounded-full border border-emerald-700/50 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300 transition hover:bg-emerald-900/40"
                  >
                    🟢 Connect on WhatsApp
                  </button>
                ) : (
                  <span className="text-xs text-zinc-500">WhatsApp threads on this deal</span>
                )}
              </div>
              {dealConversations.length ? (
                <>
                  {dealConversations.length > 1 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {dealConversations.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setActiveConvId(c.id)}
                          className={cn(
                            "rounded-full border px-3 py-1 text-xs transition",
                            activeConv?.id === c.id
                              ? "border-emerald-500 bg-emerald-600/15 text-emerald-300"
                              : "border-line text-zinc-400 hover:border-zinc-600",
                          )}
                        >
                          {c.participant_name} · {c.participant_role}
                        </button>
                      ))}
                    </div>
                  )}
                  {activeConv && user && (
                    <div className="mt-3 grid grid-cols-1 gap-4">
                      <WhatsAppThread conversation={activeConv} currentUser={user} />
                      <RelationshipPanel conversation={activeConv} deal={deal} />
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">
                  No conversations yet. Once a buyer or investor connects on WhatsApp, the thread and AI relationship
                  insights will appear here.
                </p>
              )}
            </div>
          </FadeUp>

          {/* Blockchain trail */}
          <FadeUp>
            <BlockchainTrail deal={deal} copied={copied} onCopy={() => { navigator.clipboard?.writeText(deal.chain_hash); setCopied(true); toast.success("Hash copied"); }} />
          </FadeUp>

          <FadeUp>
            <DealTimeline deal={deal} />
          </FadeUp>
        </div>

        {/* RIGHT — Bidding Room */}
        <div className="lg:col-span-2">
          {user && <BiddingRoom deal={deal} currentUser={user} />}
        </div>
      </div>
    </div>
  );
}

function OffPlanFact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-zinc-600">{label}</p>
      <p className="mt-0.5 text-sm font-medium capitalize text-zinc-200">{value}</p>
    </div>
  );
}

function BlockchainTrail({
  deal,
  copied,
  onCopy,
}: {
  deal: DistressDeal;
  copied: boolean;
  onCopy: () => void;
}) {
  const chip =
    deal.chain_status === "on_chain"
      ? { label: "🔗 On-Chain Verified", cls: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300" }
      : deal.chain_status === "verified"
        ? { label: "⏳ Pending Verification", cls: "border-indigo-700/50 bg-indigo-900/30 text-indigo-300" }
        : { label: "Unverified", cls: "border-zinc-700 bg-zinc-800 text-zinc-400" };
  const block = 18_400_000 + (parseInt(deal.id.replace(/\D/g, "") || "1", 10) * 137);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Blockchain Trail</h3>
        <Badge className={chip.cls}>{chip.label}</Badge>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <code className="rounded-md border border-line bg-surface px-2 py-1 font-mono text-xs text-zinc-300">
          {shortHash(deal.chain_hash)}
        </code>
        <button onClick={onCopy} className="text-xs text-indigo-400 hover:text-indigo-300">
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="flex h-8 w-12 items-center justify-center rounded border border-indigo-700/50 bg-indigo-950/40 font-mono text-[10px] text-indigo-300 animate-pulse-block"
              style={{ animationDelay: `${i * 0.3}s` }}
            >
              #{(block + i).toString().slice(-4)}
            </div>
            {i < 2 && <span className="text-zinc-700">—</span>}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-500">
        This deal&apos;s details are immutably recorded. All bid activity is tracked on-chain.
      </p>
    </div>
  );
}
