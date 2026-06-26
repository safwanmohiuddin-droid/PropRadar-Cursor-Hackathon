"use client";

import { useEffect, useState } from "react";
import type { Conversation, DistressDeal, RelationshipInsight } from "@/lib/types";
import { useStore } from "@/lib/store";
import Gauge from "@/components/ui/Gauge";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/ui";

const SENTIMENT_BADGE: Record<string, string> = {
  positive: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  neutral: "border-zinc-700 bg-zinc-800 text-zinc-300",
  negative: "border-red-800/50 bg-red-950/40 text-red-400",
};
const ENGAGEMENT_BADGE: Record<string, string> = {
  high: "border-emerald-700/50 bg-emerald-900/30 text-emerald-300",
  medium: "border-amber-700/50 bg-amber-900/30 text-amber-300",
  low: "border-zinc-700 bg-zinc-800 text-zinc-400",
};

export default function RelationshipPanel({
  conversation,
  deal,
}: {
  conversation: Conversation;
  deal?: DistressDeal;
}) {
  const cacheAi = useStore((s) => s.cacheAi);
  const readAi = useStore((s) => s.readAi);
  const [insight, setInsight] = useState<RelationshipInsight | null>(null);
  const [loading, setLoading] = useState(false);

  // Cache key changes when new messages arrive, so analysis refreshes.
  const cacheKey = `rel:${conversation.id}:${conversation.messages.length}`;

  useEffect(() => {
    const cached = readAi<RelationshipInsight>(cacheKey);
    if (cached) {
      setInsight(cached);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch("/api/relationship-insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation, deal }),
    })
      .then((r) => r.json())
      .then((data: RelationshipInsight) => {
        if (cancelled) return;
        setInsight(data);
        cacheAi(cacheKey, data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">AI Relationship Manager</h3>
        {insight && <Badge className={SENTIMENT_BADGE[insight.sentiment]}>{insight.sentiment}</Badge>}
      </div>

      {loading && !insight ? (
        <div className="flex items-center gap-3 py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <span className="text-sm text-zinc-500">Analysing the conversation…</span>
        </div>
      ) : insight ? (
        <>
          <div className="mt-3 flex items-center gap-4">
            <Gauge value={insight.health_score} size={88} label="Health" from="#6366f1" to="#10b981" />
            <div className="flex-1">
              <p className="text-sm text-zinc-300">{insight.summary}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge className={ENGAGEMENT_BADGE[insight.engagement_level]}>
                  {insight.engagement_level} engagement
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs uppercase text-emerald-500">Intent signals</p>
              <ul className="space-y-1">
                {insight.intent_signals.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                    <span className="text-emerald-500">✓</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1.5 text-xs uppercase text-amber-500">Risks</p>
              <ul className="space-y-1">
                {insight.risks.map((s, i) => (
                  <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                    <span className="text-amber-500">•</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className={cn("mt-4 rounded-lg border border-indigo-700/40 bg-indigo-950/30 p-3 text-sm text-zinc-300")}>
            <span className="text-indigo-400">Recommended:</span> {insight.recommended_action}
          </div>
        </>
      ) : (
        <p className="py-6 text-sm text-zinc-500">No analysis yet.</p>
      )}
    </div>
  );
}
