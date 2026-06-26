"use client";

import Link from "next/link";
import type { Investor } from "@/lib/types";
import { investorTypeBadge, investorTypeLabel } from "@/lib/ui";
import Badge from "@/components/ui/Badge";
import Gauge from "@/components/ui/Gauge";

export default function InvestorCard({
  investor,
  matchScore,
  matchReasons,
}: {
  investor: Investor;
  matchScore?: number;
  matchReasons?: string[];
}) {
  return (
    <Link href={`/investors/${investor.investor_id}`} className="block">
      <div className="card card-hover h-full p-5">
        <div className="flex items-start justify-between">
          <div>
            <Badge className={investorTypeBadge(investor.investor_type)}>
              {investorTypeLabel(investor.investor_type)}
            </Badge>
            <p className="mt-2 font-mono text-sm text-zinc-200">{investor.capital_range_aed}</p>
            <p className="font-mono text-[11px] text-zinc-600">{investor.investor_id}</p>
          </div>
          <Gauge
            value={matchScore ?? investor.relationship_score}
            size={64}
            label={matchScore != null ? "Match" : "Rel."}
            from="#6366f1"
            to="#10b981"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge className="border-zinc-700 bg-zinc-800 capitalize text-zinc-400">
            {investor.preferred_sector}
          </Badge>
          <Badge className="border-zinc-700 bg-zinc-800 text-zinc-400">{investor.preferred_district}</Badge>
          <Badge className="border-zinc-700 bg-zinc-800 capitalize text-zinc-400">
            {investor.risk_profile}
          </Badge>
        </div>

        {matchReasons && matchReasons.length > 0 ? (
          <ul className="mt-3 space-y-1">
            {matchReasons.slice(0, 2).map((r, i) => (
              <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                <span className="text-emerald-500">✓</span>
                {r}
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{investor.deals_closed} deals closed</span>
            <span className="capitalize">{investor.investment_horizon}-term</span>
          </div>
        )}
      </div>
    </Link>
  );
}
