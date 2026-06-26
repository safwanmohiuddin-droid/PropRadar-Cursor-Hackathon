"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { AppUser, Bid, DistressDeal } from "@/lib/types";
import { useStore } from "@/lib/store";
import { TIER_RULES } from "@/lib/scoring";
import { formatAED } from "@/lib/format";
import { cn, TIER_BADGE } from "@/lib/ui";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import type { BidEvaluation } from "@/lib/mock";

export default function BiddingRoom({
  deal,
  currentUser,
}: {
  deal: DistressDeal;
  currentUser: AppUser;
}) {
  const updateDeal = useStore((s) => s.updateDeal);
  const submitBid = useStore((s) => s.submitBid);

  const [amount, setAmount] = useState<string>(String(deal.asking_price_aed));
  const [conditions, setConditions] = useState("");
  const [validity, setValidity] = useState(14);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluation, setEvaluation] = useState<BidEvaluation | null>(null);

  const isSeller = currentUser.id === deal.seller_id;
  const rule = TIER_RULES[currentUser.tier];
  const filled = deal.bids.filter((b) => b.status === "pending" || b.status === "accepted").length;
  const sortedBids = useMemo(
    () => [...deal.bids].sort((a, b) => b.amount_aed - a.amount_aed),
    [deal.bids],
  );

  const numericAmount = Number(amount) || 0;
  const deltaPct = ((numericAmount - deal.asking_price_aed) / deal.asking_price_aed) * 100;

  async function evaluateBid() {
    setEvaluating(true);
    try {
      const res = await fetch("/api/bid-evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bid: { amount_aed: numericAmount, conditions, validity_days: validity },
          deal,
          bidder: currentUser,
        }),
      });
      const data: BidEvaluation = await res.json();
      setEvaluation(data);
    } catch {
      toast.error("Could not evaluate bid — please retry.");
    } finally {
      setEvaluating(false);
    }
  }

  function confirmBid() {
    if (!evaluation) return;
    const bid: Bid = {
      id: `BID-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      deal_id: deal.id,
      bidder_id: currentUser.id,
      bidder_name: currentUser.name,
      bidder_tier: currentUser.tier,
      bidder_credibility: currentUser.credibility_score,
      amount_aed: numericAmount,
      conditions,
      validity_days: validity,
      status: evaluation.legitimacy_score < 40 ? "rejected" : "pending",
      ai_legitimacy_score: evaluation.legitimacy_score,
      ai_legitimacy_note: evaluation.legitimacy_note,
      submitted_at: new Date().toISOString(),
    };
    submitBid(deal.id, bid);
    if (evaluation.legitimacy_score < 40) {
      toast.error("Bid flagged & rejected — 15 credibility points deducted.");
    } else {
      toast.success("Bid submitted to the seller.");
    }
    setEvaluation(null);
    setConditions("");
  }

  function setBidStatus(bidId: string, status: Bid["status"]) {
    const bids = deal.bids.map((b) => (b.id === bidId ? { ...b, status } : b));
    const updates: Partial<DistressDeal> = { bids };
    if (status === "accepted") updates.status = "under_offer";
    updateDeal(deal.id, updates);
    toast.success(`Bid ${status}.`);
  }

  return (
    <div className="space-y-5">
      {/* Slot visualization */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">Bidding Room</h3>
          <span className="text-xs text-zinc-500">
            {filled} of {deal.bid_slots} slots filled
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {Array.from({ length: deal.bid_slots }).map((_, i) => (
            <span
              key={i}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full border text-xs",
                i < filled
                  ? "border-indigo-500 bg-indigo-600/20 text-indigo-300"
                  : "border-dashed border-line text-zinc-600",
              )}
            >
              {i < filled ? "●" : "○"}
            </span>
          ))}
        </div>
      </div>

      {/* Credibility gate / bid form */}
      {!isSeller && (
        <div className="card p-5">
          {!rule.canBid ? (
            <div className="text-center">
              <div className="mb-2 text-3xl">🔒</div>
              <p className="text-sm font-medium text-zinc-200">Bidding locked</p>
              <p className="mt-1 text-sm text-zinc-500">
                Your credibility score is{" "}
                <span className="font-mono text-zinc-300">{currentUser.credibility_score}</span>. You need{" "}
                <span className="font-mono text-zinc-300">25</span> to place bids. Complete your profile and verify
                your identity to start earning credibility.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-200">Place a bid</h4>
                <Badge className={TIER_BADGE[currentUser.tier]}>
                  {rule.maxSlots === "any" ? "Any slot" : `Up to ${rule.maxSlots} slots`}
                </Badge>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Bid amount (AED)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input font-mono"
                />
                <p
                  className={cn(
                    "mt-1 text-xs",
                    deltaPct >= 0 ? "text-emerald-400" : deltaPct >= -8 ? "text-amber-400" : "text-red-400",
                  )}
                >
                  {deltaPct >= 0 ? "+" : ""}
                  {deltaPct.toFixed(1)}% vs asking ({formatAED(deal.asking_price_aed)})
                </p>
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Conditions (optional)</label>
                <textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  rows={2}
                  placeholder="e.g. subject to survey, cash purchase"
                  className="input resize-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-zinc-500">Validity</label>
                <select
                  value={validity}
                  onChange={(e) => setValidity(Number(e.target.value))}
                  className="input"
                >
                  <option value={7}>7 days</option>
                  <option value={14}>14 days</option>
                  <option value={30}>30 days</option>
                </select>
              </div>
              <button onClick={evaluateBid} disabled={evaluating || !numericAmount} className="btn-primary w-full">
                {evaluating ? "Claude is evaluating…" : "Submit Bid"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Active bids */}
      <div className="card p-5">
        <h4 className="mb-3 text-sm font-semibold text-zinc-200">Active bids ({deal.bids.length})</h4>
        {sortedBids.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-500">No bids yet — be the first serious buyer.</p>
        ) : (
          <div className="space-y-3">
            {sortedBids.map((bid) => {
              const flagged = bid.ai_legitimacy_score < 40;
              return (
                <div
                  key={bid.id}
                  className={cn(
                    "rounded-lg border border-line bg-surface p-3",
                    flagged && "opacity-60",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={TIER_BADGE[(bid.bidder_tier as keyof typeof TIER_BADGE) ?? "silver"]}>
                        {bid.bidder_tier}
                      </Badge>
                      <span className="text-sm text-zinc-300">{bid.bidder_name}</span>
                    </div>
                    <span className="font-mono text-base font-semibold text-zinc-50">
                      {formatAED(bid.amount_aed)}
                    </span>
                  </div>
                  {bid.conditions && <p className="mt-1 text-xs text-zinc-500">{bid.conditions}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge
                      className={
                        bid.ai_legitimacy_score >= 70
                          ? "border-emerald-800/50 bg-emerald-950/40 text-emerald-400"
                          : bid.ai_legitimacy_score >= 40
                            ? "border-amber-800/50 bg-amber-950/40 text-amber-400"
                            : "border-red-800/50 bg-red-950/40 text-red-400"
                      }
                    >
                      Legitimacy {bid.ai_legitimacy_score}
                    </Badge>
                    {flagged && (
                      <Badge className="border-amber-800/50 bg-amber-950/40 text-amber-400">⚠ AI Flagged</Badge>
                    )}
                    <Badge className="capitalize">{bid.status}</Badge>
                  </div>

                  {isSeller && bid.status === "pending" && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setBidStatus(bid.id, "accepted")}
                        className="btn-primary flex-1 py-1.5 text-xs"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setBidStatus(bid.id, "rejected")}
                        className="btn-ghost flex-1 border border-line py-1.5 text-xs"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => toast("Counter-offer drafted (demo).")}
                        className="btn-ghost flex-1 border border-line py-1.5 text-xs"
                      >
                        Counter
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {isSeller && (
          <div className="mt-4 flex gap-2 border-t border-line pt-4">
            <button
              onClick={() => {
                updateDeal(deal.id, { status: "closed" });
                toast.success("Bidding closed.");
              }}
              className="btn-ghost flex-1 border border-line text-xs"
            >
              Close Bidding
            </button>
            <button
              onClick={() => {
                const newDeadline = new Date(
                  new Date(deal.bid_deadline).getTime() + 7 * 86400000,
                ).toISOString();
                updateDeal(deal.id, { bid_deadline: newDeadline });
                toast.success("Deadline extended by 7 days.");
              }}
              className="btn-ghost flex-1 border border-line text-xs"
            >
              Extend Deadline
            </button>
          </div>
        )}
      </div>

      {/* Legitimacy confirmation modal */}
      <Modal open={!!evaluation} onClose={() => setEvaluation(null)}>
        {evaluation && (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-100">AI Bid Review</h3>
              <span className="font-mono text-2xl font-bold text-zinc-50">{evaluation.legitimacy_score}</span>
            </div>
            <p
              className={cn(
                "rounded-lg border p-3 text-sm",
                evaluation.legitimacy_score >= 70
                  ? "border-emerald-800/50 bg-emerald-950/30 text-emerald-300"
                  : evaluation.legitimacy_score >= 40
                    ? "border-amber-800/50 bg-amber-950/30 text-amber-300"
                    : "border-red-800/50 bg-red-950/30 text-red-300",
              )}
            >
              {evaluation.legitimacy_score >= 70
                ? "Strong bid — proceed?"
                : evaluation.legitimacy_score >= 40
                  ? `Conditional bid — Claude flagged: ${evaluation.legitimacy_note} Proceed anyway?`
                  : "Bid flagged as below serious threshold. Submitting will cost you 15 credibility points. Are you sure?"}
            </p>
            <p className="mt-2 text-xs text-zinc-500">{evaluation.bid_vs_market} · {evaluation.legitimacy_note}</p>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setEvaluation(null)} className="btn-ghost flex-1 border border-line">
                Cancel
              </button>
              <button
                onClick={confirmBid}
                className={cn("flex-1", evaluation.legitimacy_score < 40 ? "btn-danger" : "btn-primary")}
              >
                Confirm
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
