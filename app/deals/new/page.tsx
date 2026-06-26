"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import type { DealScore, DistressDeal, InvestorMatch } from "@/lib/types";
import { ASSET_TYPES, DISTRESS_REASONS, cn } from "@/lib/ui";
import { formatAED, formatPct } from "@/lib/format";
import DealScoreCard from "@/components/deals/DealScoreCard";
import { FadeUp } from "@/components/ui/Motion";

const STEPS = ["Property", "Pricing & Urgency", "AI Score", "Review"];

function makeHash() {
  const u = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(16).slice(2));
  return `0x${u().slice(0, 8)}...${u().slice(0, 4)}`;
}

export default function NewDealPage() {
  const router = useRouter();
  const districts = useStore((s) => s.districts);
  const investors = useStore((s) => s.investors);
  const user = useStore((s) => s.users[s.currentUserId]);
  const addDeal = useStore((s) => s.addDeal);
  const updateDeal = useStore((s) => s.updateDeal);

  const [step, setStep] = useState(0);
  const [district, setDistrict] = useState("");
  const [assetType, setAssetType] = useState("villa");
  const [size, setSize] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [description, setDescription] = useState("");
  const [asking, setAsking] = useState("");
  const [reason, setReason] = useState("relocation");
  const [deadline, setDeadline] = useState("");
  const [slots, setSlots] = useState(5);
  const [completion, setCompletion] = useState<"off_plan" | "ready">("off_plan");
  const [developer, setDeveloper] = useState("");
  const [handover, setHandover] = useState("");
  const [paidPct, setPaidPct] = useState("");
  const [scoring, setScoring] = useState(false);
  const [score, setScore] = useState<DealScore | null>(null);

  const dist = useMemo(() => districts.find((d) => d.district === district), [districts, district]);
  const sizeN = Number(size) || 0;
  const askN = Number(asking) || 0;
  const isCommercial = ["commercial", "warehouse", "plot"].includes(assetType);

  // Estimated market value from district avg price/sqm.
  const marketValue = dist && sizeN ? Math.round(dist.avg_price_sqm * sizeN) : 0;
  const discountPct = marketValue > 0 ? ((marketValue - askN) / marketValue) * 100 : 0;
  const urgencyDays = deadline
    ? Math.max(0, Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000))
    : 30;

  const canStep1 = district && sizeN > 0;
  const canStep2 = askN > 0 && deadline;

  function buildPartial(): Partial<DistressDeal> {
    return {
      district,
      asset_type: assetType,
      bedrooms: isCommercial ? null : Number(bedrooms) || 0,
      size_sqm: sizeN,
      asking_price_aed: askN,
      market_value_aed: marketValue,
      discount_pct: Math.round(discountPct * 10) / 10,
      distress_reason: reason,
      urgency_days: urgencyDays,
      description,
      completion_status: completion,
      title: `${dist?.district ?? district} ${assetType} — ${reason}`,
    };
  }

  async function getScore() {
    setScoring(true);
    setScore(null);
    try {
      const res = await fetch("/api/score-deal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal: buildPartial(), district: dist }),
      });
      const data: DealScore = await res.json();
      setScore(data);
    } catch {
      toast.error("Scoring failed — please retry.");
    } finally {
      setScoring(false);
    }
  }

  async function publish() {
    if (!score) return;
    const id = `DEAL-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const partial = buildPartial();

    // Match investors up front so the published deal is ready to view.
    let matched: InvestorMatch[] = [];
    try {
      const m = await fetch("/api/match-investors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deal: { ...partial, id, distress_score: score.distress_score }, investors, district: dist }),
      }).then((r) => r.json());
      matched = m.matches ?? [];
    } catch {
      /* mock fallback handled server-side */
    }

    const deal: DistressDeal = {
      id,
      seller_id: user.id,
      title: partial.title!,
      district,
      asset_type: assetType,
      bedrooms: partial.bedrooms ?? null,
      size_sqm: sizeN,
      asking_price_aed: askN,
      market_value_aed: marketValue,
      discount_pct: partial.discount_pct!,
      distress_reason: reason,
      urgency_days: urgencyDays,
      description: description || `${reason} sale in ${district}.`,
      status: "ai_scoring",
      distress_score: score.distress_score,
      deal_quality_score: score.deal_quality_score,
      ai_summary: score.ai_summary,
      ai_green_flags: score.green_flags,
      ai_red_flags: score.red_flags,
      matched_investors: matched,
      bids: [],
      bid_slots: slots,
      bid_deadline: deadline ? new Date(deadline).toISOString() : new Date(Date.now() + urgencyDays * 86400000).toISOString(),
      chain_hash: makeHash(),
      chain_status: "unverified",
      created_at: new Date().toISOString(),
      views: 0,
      latitude: dist?.latitude ?? 24.45,
      longitude: dist?.longitude ?? 54.4,
      completion_status: completion,
      developer: developer || undefined,
      handover_date: completion === "off_plan" && handover ? new Date(handover).toISOString() : null,
      payment_plan: completion === "off_plan" ? "Custom plan" : "Cash / ready",
      paid_pct: completion === "off_plan" && paidPct ? Number(paidPct) : 100,
    };

    addDeal(deal);
    toast.success("Deal published — AI scoring & chain verification running.");

    // Mock chain confirmation sequence (rule 6).
    setTimeout(() => updateDeal(id, { status: "matched", chain_status: "verified" }), 2000);
    setTimeout(() => updateDeal(id, { status: "bidding", chain_status: "on_chain" }), 6000);

    router.push(`/deals/${id}`);
  }

  if (user?.role !== "seller") {
    return (
      <div className="card p-8 text-center">
        <p className="text-zinc-300">Switch to the Seller role to submit a deal.</p>
        <button onClick={() => useStore.getState().setRole("seller")} className="btn-primary mt-4">
          Switch to Seller
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Submit a Distressed Deal</h1>
        <div className="mt-3 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 items-center gap-2">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  i <= step ? "bg-indigo-600 text-white" : "bg-zinc-800 text-zinc-500",
                )}
              >
                {i + 1}
              </div>
              <span className={cn("hidden text-xs sm:block", i <= step ? "text-zinc-200" : "text-zinc-600")}>{s}</span>
              {i < STEPS.length - 1 && <div className={cn("h-px flex-1", i < step ? "bg-indigo-600" : "bg-zinc-800")} />}
            </div>
          ))}
        </div>
      </div>

      <FadeUp key={step}>
        <div className="card p-6">
          {step === 0 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">District</label>
                <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input">
                  <option value="">Select a district…</option>
                  {districts.map((d) => (
                    <option key={d.district} value={d.district}>
                      {d.district}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Asset type</label>
                <div className="grid grid-cols-3 gap-2">
                  {ASSET_TYPES.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setAssetType(a.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 transition",
                        assetType === a.id ? "border-indigo-500 bg-indigo-600/10" : "border-line hover:border-zinc-600",
                      )}
                    >
                      <span className="text-2xl">{a.icon}</span>
                      <span className="text-xs text-zinc-300">{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-zinc-400">Size (sqm)</label>
                  <input type="number" value={size} onChange={(e) => setSize(e.target.value)} className="input" placeholder="380" />
                </div>
                {!isCommercial && (
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Bedrooms</label>
                    <input type="number" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="input" placeholder="4" />
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Completion status</label>
                <div className="flex gap-2">
                  {[
                    { id: "off_plan", label: "Off-plan" },
                    { id: "ready", label: "Ready" },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCompletion(c.id as "off_plan" | "ready")}
                      className={cn(
                        "flex-1 rounded-lg border px-3 py-2 text-sm transition",
                        completion === c.id ? "border-indigo-500 bg-indigo-600/10 text-indigo-300" : "border-line text-zinc-400 hover:border-zinc-600",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              {completion === "off_plan" && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Developer</label>
                    <input value={developer} onChange={(e) => setDeveloper(e.target.value)} className="input" placeholder="Aldar" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">Handover</label>
                    <input type="date" value={handover} onChange={(e) => setHandover(e.target.value)} className="input" />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">% Paid</label>
                    <input type="number" value={paidPct} onChange={(e) => setPaidPct(e.target.value)} className="input font-mono" placeholder="55" />
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="input resize-none"
                  placeholder="Why is this a distressed sale? Add context the AI can use."
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Asking price (AED)</label>
                <input type="number" value={asking} onChange={(e) => setAsking(e.target.value)} className="input font-mono" placeholder="2800000" />
                {dist && sizeN > 0 && askN > 0 && (
                  <div className="mt-2 rounded-lg border border-line bg-surface p-3 text-xs">
                    <p className="text-zinc-400">
                      {formatAED(askN)} vs {deal2(dist.avg_price_sqm, sizeN)} district estimate —{" "}
                      <span className={discountPct >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {discountPct >= 0 ? "you are " : "you are "}
                        {formatPct(Math.abs(discountPct))} {discountPct >= 0 ? "below" : "above"} market
                      </span>
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="mb-2 block text-sm text-zinc-400">Distress reason</label>
                <div className="grid grid-cols-3 gap-2">
                  {DISTRESS_REASONS.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setReason(r.id)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg border p-3 transition",
                        reason === r.id ? "border-indigo-500 bg-indigo-600/10" : "border-line hover:border-zinc-600",
                      )}
                    >
                      <span className="text-xl">{r.icon}</span>
                      <span className="text-xs text-zinc-300">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">Urgency deadline</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="input" />
                {deadline && <p className="mt-1 text-xs text-zinc-500">{urgencyDays} days remaining</p>}
              </div>
              <div>
                <label className="mb-1 block text-sm text-zinc-400">
                  Bid slots: <span className="font-mono text-zinc-200">{slots}</span>
                </label>
                <input type="range" min={2} max={10} value={slots} onChange={(e) => setSlots(Number(e.target.value))} className="w-full accent-indigo-500" />
                <p className="text-xs text-zinc-500">More slots = more competition; fewer slots = more exclusivity.</p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {!score && !scoring && (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <p className="text-sm text-zinc-400">Ready to score this deal against the Abu Dhabi market.</p>
                  <button onClick={getScore} className="btn-primary px-6 py-3 text-base">
                    Get AI Deal Score
                  </button>
                </div>
              )}
              {scoring && (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                  <p className="text-sm text-zinc-400">Claude is analyzing your deal against 5,000 Abu Dhabi transactions…</p>
                </div>
              )}
              {score && (
                <DealScoreCard
                  score={score}
                  marketAsk={sizeN ? Math.round(askN / sizeN) : 0}
                  marketLow={dist ? Math.round(dist.avg_price_sqm * 0.7) : undefined}
                  marketHigh={dist ? Math.round(dist.avg_price_sqm * 1.3) : undefined}
                />
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-zinc-200">Review & publish</h3>
              <dl className="divide-y divide-line rounded-lg border border-line">
                {[
                  ["District", district],
                  ["Asset", `${assetType}${isCommercial ? "" : ` · ${bedrooms || 0} bd`} · ${sizeN} sqm`],
                  ["Asking price", formatAED(askN)],
                  ["Est. market value", formatAED(marketValue)],
                  ["Discount", formatPct(discountPct)],
                  ["Distress reason", reason],
                  ["Urgency", `${urgencyDays} days`],
                  ["Bid slots", String(slots)],
                  ["Distress score", String(score?.distress_score ?? "—")],
                  ["Quality score", String(score?.deal_quality_score ?? "—")],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 text-sm">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="font-medium capitalize text-zinc-200">{v}</dd>
                  </div>
                ))}
              </dl>
              <button onClick={publish} className="btn-primary w-full py-3 text-base">
                Publish Deal
              </button>
            </div>
          )}
        </div>
      </FadeUp>

      <div className="flex items-center justify-between">
        <button onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className="btn-ghost disabled:opacity-0">
          ← Back
        </button>
        {step < 3 && (
          <button
            onClick={() => setStep((s) => s + 1)}
            disabled={(step === 0 && !canStep1) || (step === 1 && !canStep2) || (step === 2 && !score)}
            className="btn-primary"
          >
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

function deal2(avgPerSqm: number, size: number): string {
  return formatAED(avgPerSqm * size);
}
