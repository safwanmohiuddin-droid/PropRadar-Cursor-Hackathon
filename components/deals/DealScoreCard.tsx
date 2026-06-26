"use client";

import type { DealScore } from "@/lib/types";
import Gauge from "@/components/ui/Gauge";
import Badge from "@/components/ui/Badge";

const URGENCY_BADGE: Record<string, string> = {
  critical: "border-red-700/50 bg-red-950/50 text-red-400",
  high: "border-amber-700/50 bg-amber-950/40 text-amber-400",
  moderate: "border-orange-700/50 bg-orange-950/40 text-orange-400",
  low: "border-zinc-700 bg-zinc-800 text-zinc-400",
};

export default function DealScoreCard({
  score,
  marketLow,
  marketHigh,
  marketAsk,
}: {
  score: DealScore;
  marketLow?: number;
  marketHigh?: number;
  marketAsk?: number;
}) {
  const showBar =
    marketLow != null && marketHigh != null && marketAsk != null && marketHigh > marketLow;
  const pos = showBar
    ? Math.max(0, Math.min(100, ((marketAsk! - marketLow!) / (marketHigh! - marketLow!)) * 100))
    : 0;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-200">AI Deal Score</h3>
        <Badge className={URGENCY_BADGE[score.urgency_tier]}>
          {score.urgency_tier} urgency
        </Badge>
      </div>

      <div className="mt-4 flex items-center justify-center gap-8">
        <Gauge value={score.distress_score} label="Distress" from="#f59e0b" to="#ef4444" />
        <Gauge value={score.deal_quality_score} label="Quality" from="#6366f1" to="#10b981" />
      </div>

      <div className="mt-4 rounded-lg border border-indigo-700/40 bg-indigo-950/30 p-3">
        <p className="text-sm leading-relaxed text-zinc-300">{score.ai_summary}</p>
      </div>

      {score.green_flags.length > 0 && (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-emerald-500">Green flags</p>
          <div className="flex flex-wrap gap-2">
            {score.green_flags.map((f, i) => (
              <Badge key={i} className="border-emerald-800/50 bg-emerald-950/40 text-emerald-400">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {score.red_flags.length > 0 && (
        <div className="mt-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-red-500">Red flags</p>
          <div className="flex flex-wrap gap-2">
            {score.red_flags.map((f, i) => (
              <Badge key={i} className="border-red-800/50 bg-red-950/40 text-red-400">
                {f}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        <p className="text-xs text-zinc-500">{score.price_vs_market}</p>
        {showBar && (
          <div className="mt-3">
            <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-emerald-600/60 via-amber-600/60 to-red-600/60">
              <div
                className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-zinc-50 shadow"
                style={{ left: `${pos}%` }}
              />
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-zinc-600">
              <span>District low</span>
              <span>This deal</span>
              <span>District high</span>
            </div>
          </div>
        )}
        <p className="mt-3 text-xs text-zinc-500">
          Recommended bid slots:{" "}
          <span className="font-mono text-zinc-300">{score.recommended_slot_count}</span>
        </p>
      </div>
    </div>
  );
}
