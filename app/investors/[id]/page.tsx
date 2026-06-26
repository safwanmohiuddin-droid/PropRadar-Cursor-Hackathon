"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/store";
import { investorTypeBadge, investorTypeLabel } from "@/lib/ui";
import { formatAEDCompact } from "@/lib/format";
import Badge from "@/components/ui/Badge";
import Gauge from "@/components/ui/Gauge";
import Kpi from "@/components/ui/Kpi";
import EmptyState from "@/components/ui/EmptyState";
import MiniMap from "@/components/ui/MiniMap";
import DealCard from "@/components/deals/DealCard";
import { PriceLineChart } from "@/components/analytics/MarketChart";
import { FadeUp } from "@/components/ui/Motion";

export default function InvestorProfilePage() {
  const params = useParams<{ id: string }>();
  const investor = useStore((s) => s.investors.find((i) => i.investor_id === params.id));
  const districts = useStore((s) => s.districts);
  const market = useStore((s) => s.market);
  const deals = useStore((s) => s.deals);

  const dist = useMemo(
    () => districts.find((d) => d.district === investor?.preferred_district),
    [districts, investor?.preferred_district],
  );

  if (!investor) {
    return <EmptyState icon="💼" title="Investor not found" ctaLabel="Back to directory" ctaHref="/investors" />;
  }

  const matchedDeals = deals.filter((d) =>
    d.matched_investors.some((m) => m.investor_id === investor.investor_id),
  );
  const series = market?.seriesByDistrict[investor.preferred_district] ?? [];

  const strengths = [
    `${investorTypeLabel(investor.investor_type)} with a clear ${investor.preferred_sector} mandate`,
    `${investor.deals_closed} deals closed with a ${(investor.response_rate * 100).toFixed(0)}% response rate`,
    investor.relationship_score >= 75 ? "Top-quartile relationship score" : "Reliable, responsive counterparty",
  ];
  const gaps = [
    `Capital concentrated in the ${investor.capital_range_aed} band`,
    `${investor.investment_horizon[0].toUpperCase()}${investor.investment_horizon.slice(1)}-horizon limits some distress plays`,
    investor.risk_profile === "conservative"
      ? "Conservative risk profile screens out deep-distress assets"
      : "Open to higher-risk distressed opportunities",
  ];
  const assessment = `${investor.investor_id} is a ${investor.risk_profile} ${investorTypeLabel(
    investor.investor_type,
  ).toLowerCase()} focused on ${investor.preferred_sector} assets in ${investor.preferred_district}. With a deployable range of ${
    investor.capital_range_aed
  } and a ${investor.investment_horizon}-term horizon, this mandate is best matched to ${
    investor.risk_profile === "aggressive" ? "high-distress, fast-close" : "well-priced, lower-risk"
  } opportunities where the discount is verifiable against district comparables.`;

  return (
    <div className="space-y-6">
      <Link href="/investors" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Directory
      </Link>

      <FadeUp>
        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <Badge className={investorTypeBadge(investor.investor_type)}>
              {investorTypeLabel(investor.investor_type)}
            </Badge>
            <h1 className="mt-2 font-mono text-2xl font-bold text-zinc-50">{investor.investor_id}</h1>
            <p className="mt-1 font-mono text-sm text-zinc-400">{investor.capital_range_aed} deployable</p>
          </div>
          <Gauge value={investor.relationship_score} label="Relationship" size={110} />
        </div>
      </FadeUp>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Relationship Score" value={investor.relationship_score} accent="text-indigo-300" />
        <Kpi label="Deals Closed" value={investor.deals_closed} />
        <Kpi label="Avg Deal Time" value={`${investor.avg_deal_time_days}d`} />
        <Kpi label="Response Rate" value={`${(investor.response_rate * 100).toFixed(0)}%`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <FadeUp>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-zinc-200">Investment Mandate</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge className="border-indigo-700/50 bg-indigo-900/30 capitalize text-indigo-300">
                  {investor.preferred_sector}
                </Badge>
                <Badge className="capitalize">{investor.risk_profile}</Badge>
                <Badge className="capitalize">{investor.investment_horizon}-term</Badge>
                <Badge>{investor.preferred_district}</Badge>
              </div>
              <div className="mt-4">
                <p className="mb-1 text-xs text-zinc-500">Capital deployment</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-zinc-300">{formatAEDCompact(investor.capital_min)}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-gradient-to-r from-indigo-600 to-emerald-500" />
                  <span className="font-mono text-zinc-300">{formatAEDCompact(investor.capital_max)}</span>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-zinc-200">AI Match Analysis</h3>
              <p className="mt-2 rounded-lg border border-indigo-700/40 bg-indigo-950/30 p-3 text-sm text-zinc-300">
                {assessment}
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-xs uppercase text-emerald-500">Strengths</p>
                  <ul className="space-y-1">
                    {strengths.map((s, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                        <span className="text-emerald-500">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="mb-2 text-xs uppercase text-amber-500">Mandate gaps</p>
                  <ul className="space-y-1">
                    {gaps.map((g, i) => (
                      <li key={i} className="flex gap-1.5 text-xs text-zinc-400">
                        <span className="text-amber-500">•</span> {g}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-zinc-200">
                District Activity — {investor.preferred_district}
              </h3>
              {series.length ? (
                <div className="mt-3">
                  <PriceLineChart data={series} color="#10b981" />
                </div>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">No transaction history available.</p>
              )}
              <p className="mt-2 text-xs text-zinc-500">Avg price/sqm trend in the investor&apos;s preferred district.</p>
            </div>
          </FadeUp>
        </div>

        <div className="space-y-6">
          <FadeUp>
            <div className="card p-5">
              <h3 className="mb-3 text-sm font-semibold text-zinc-200">Preferred District</h3>
              <MiniMap
                latitude={dist?.latitude ?? 24.45}
                longitude={dist?.longitude ?? 54.4}
                label={investor.preferred_district}
              />
            </div>
          </FadeUp>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-zinc-200">Matched Deals</h3>
            {matchedDeals.length ? (
              <div className="space-y-4">
                {matchedDeals.map((d) => (
                  <DealCard key={d.id} deal={d} compact />
                ))}
              </div>
            ) : (
              <EmptyState icon="🔗" title="No matched deals" description="This investor hasn't been matched to a live deal yet." />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
