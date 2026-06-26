"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { TIER_RULES, nextTierProgress, tierForScore } from "@/lib/scoring";
import { TIER_BADGE, cn } from "@/lib/ui";
import { formatAEDCompact } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Gauge from "@/components/ui/Gauge";
import Kpi from "@/components/ui/Kpi";
import ProgressBar from "@/components/ui/ProgressBar";
import EmptyState from "@/components/ui/EmptyState";
import { FadeUp } from "@/components/ui/Motion";

export default function BuyerProfilePage() {
  const params = useParams<{ id: string }>();
  const users = useStore((s) => s.users);
  const deals = useStore((s) => s.deals);

  const bids = useMemo(
    () =>
      deals.flatMap((d) =>
        d.bids.filter((b) => b.bidder_id === params.id).map((b) => ({ deal: d.title, ...b })),
      ),
    [deals, params.id],
  );

  const user = users[params.id];
  const sample = bids[0];
  const name = user?.name ?? sample?.bidder_name ?? params.id;
  const credibility = user?.credibility_score ?? sample?.bidder_credibility ?? 0;
  const tier = user?.tier ?? (sample?.bidder_tier as keyof typeof TIER_BADGE) ?? tierForScore(credibility);

  if (!user && !sample) {
    return <EmptyState icon="🤝" title="Buyer not found" ctaLabel="Back to buyers" ctaHref="/buyers" />;
  }

  const won = bids.filter((b) => b.status === "accepted").length;
  const rejected = bids.filter((b) => b.status === "rejected" || b.status === "withdrawn").length;
  const prog = nextTierProgress(credibility);

  return (
    <div className="space-y-6">
      <Link href="/buyers" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Buyers
      </Link>

      <FadeUp>
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h1 className="text-2xl font-bold text-zinc-50">{name}</h1>
            <p className="font-mono text-[11px] text-zinc-600">{params.id}</p>
            <div className="mt-2">
              <Badge className={TIER_BADGE[tier]}>
                <span className="capitalize">{tier}</span>
              </Badge>
            </div>
            <p className="mt-2 max-w-md text-xs text-zinc-500">{TIER_RULES[tier].description}</p>
          </div>
          <Gauge value={credibility} label="Credibility" size={110} />
        </div>
      </FadeUp>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Credibility" value={credibility} accent="text-indigo-300" />
        <Kpi label="Total Bids" value={bids.length} />
        <Kpi label="Won" value={won} accent="text-emerald-400" />
        <Kpi label="Rejected / Withdrawn" value={rejected} accent="text-red-400" />
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-zinc-300">Progress to next tier</span>
          <span className="text-zinc-500">{prog.next ? `${prog.pointsNeeded} pts to ${prog.next}` : "Top tier"}</span>
        </div>
        <div className="mt-3">
          <ProgressBar
            value={credibility - prog.floor}
            max={prog.ceil - prog.floor}
            barClassName="bg-gradient-to-r from-indigo-500 to-emerald-500"
          />
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-200">Bid History</h3>
        {bids.length ? (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Deal</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Legitimacy</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {bids.map((b) => (
                  <tr key={b.id}>
                    <td className="px-4 py-3 text-zinc-300">{b.deal}</td>
                    <td className="px-4 py-3 font-mono text-zinc-200">{formatAEDCompact(b.amount_aed)}</td>
                    <td className="px-4 py-3 font-mono text-zinc-400">{b.ai_legitimacy_score}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "capitalize",
                          b.status === "accepted"
                            ? "text-emerald-400"
                            : b.status === "rejected"
                              ? "text-red-400"
                              : "text-zinc-400",
                        )}
                      >
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon="📋" title="No bids yet" description="This buyer hasn't placed any bids." />
        )}
      </div>
    </div>
  );
}
