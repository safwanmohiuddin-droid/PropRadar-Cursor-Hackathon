"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import { formatAEDCompact, formatPct } from "@/lib/format";
import { investorTypeBadge, investorTypeLabel, cn } from "@/lib/ui";
import Kpi from "@/components/ui/Kpi";
import Badge from "@/components/ui/Badge";
import ProgressBar from "@/components/ui/ProgressBar";
import {
  AssetVolumeBar,
  PriceLineChart,
  QualityScatter,
  ReasonDonut,
} from "@/components/analytics/MarketChart";

type SortKey = "district" | "avg_price_sqm" | "transaction_count" | "infrastructure_score" | "gap_score" | "active";

export default function AnalyticsPage() {
  const deals = useStore((s) => s.deals);
  const districts = useStore((s) => s.districts);
  const market = useStore((s) => s.market);
  const investors = useStore((s) => s.investors);

  const [selDistrict, setSelDistrict] = useState("overall");
  const [sortKey, setSortKey] = useState<SortKey>("gap_score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const activeDeals = deals.filter((d) => !["closed", "withdrawn"].includes(d.status));
  const totalValue = activeDeals.reduce((a, d) => a + d.asking_price_aed, 0);
  const avgDiscount = activeDeals.length
    ? activeDeals.reduce((a, d) => a + d.discount_pct, 0) / activeDeals.length
    : 0;
  const avgUrgency = activeDeals.length
    ? Math.round(activeDeals.reduce((a, d) => a + d.urgency_days, 0) / activeDeals.length)
    : 0;

  const activeByDistrict = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of activeDeals) m[d.district] = (m[d.district] || 0) + 1;
    return m;
  }, [activeDeals]);

  const priceSeries =
    selDistrict === "overall"
      ? market?.overallSeries ?? []
      : market?.seriesByDistrict[selDistrict] ?? [];

  const reasonData = useMemo(() => {
    const m: Record<string, number> = {};
    for (const d of deals) m[d.distress_reason] = (m[d.distress_reason] || 0) + 1;
    return Object.entries(m).map(([name, value]) => ({ name, value }));
  }, [deals]);

  const scatterData = deals.map((d) => ({
    x: Math.round(d.discount_pct),
    y: d.deal_quality_score,
    tier: d.urgency_days < 7 ? "critical" : d.urgency_days < 21 ? "high" : d.urgency_days < 60 ? "moderate" : "low",
    title: d.title,
  }));

  const sortedDistricts = useMemo(() => {
    const rows = districts.map((d) => ({ ...d, active: activeByDistrict[d.district] || 0 }));
    rows.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === "string" ? String(av).localeCompare(String(bv)) : (av as number) - (bv as number);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [districts, activeByDistrict, sortKey, sortDir]);

  const leaderboard = useMemo(
    () => [...investors].sort((a, b) => b.relationship_score - a.relationship_score).slice(0, 10),
    [investors],
  );

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("desc");
    }
  }

  const cols: { key: SortKey; label: string }[] = [
    { key: "district", label: "District" },
    { key: "avg_price_sqm", label: "Avg Price/sqm" },
    { key: "transaction_count", label: "Txns" },
    { key: "infrastructure_score", label: "Infra" },
    { key: "gap_score", label: "Gap" },
    { key: "active", label: "Active Deals" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">Abu Dhabi Deal Intelligence</h1>
        <p className="text-sm text-zinc-500">Synthetic transaction data across 20 districts, plus live deal flow.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Active Distress Deals" value={activeDeals.length} />
        <Kpi label="Total Deal Value" value={formatAEDCompact(totalValue)} />
        <Kpi label="Avg Discount" value={formatPct(avgDiscount)} accent="text-emerald-400" />
        <Kpi label="Avg Urgency" value={`${avgUrgency}d`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200">Avg Price/sqm Trend</h3>
            <select value={selDistrict} onChange={(e) => setSelDistrict(e.target.value)} className="input w-auto text-xs">
              <option value="overall">All districts</option>
              {districts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-3">
            <PriceLineChart data={priceSeries} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-200">Transaction Volume by Asset Type</h3>
          <div className="mt-3">
            <AssetVolumeBar data={market?.assetVolume ?? []} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-200">Distress Reason Breakdown</h3>
          <div className="mt-3">
            <ReasonDonut data={reasonData} />
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-sm font-semibold text-zinc-200">Deal Quality vs Discount</h3>
          <div className="mt-3">
            <QualityScatter data={scatterData} />
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-zinc-500">
            {[
              ["critical", "#ef4444"],
              ["high", "#f59e0b"],
              ["moderate", "#f97316"],
              ["low", "#71717a"],
            ].map(([label, c]) => (
              <span key={label} className="flex items-center gap-1 capitalize">
                <span className="h-2 w-2 rounded-full" style={{ background: c as string }} /> {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* District table */}
      <div className="card overflow-hidden">
        <h3 className="px-5 pt-5 text-sm font-semibold text-zinc-200">District Intelligence</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-line text-left text-xs uppercase text-zinc-500">
              <tr>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    onClick={() => toggleSort(c.key)}
                    className="cursor-pointer select-none px-4 py-3 hover:text-zinc-300"
                  >
                    {c.label} {sortKey === c.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
                <th className="px-4 py-3">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sortedDistricts.map((d) => (
                <tr key={d.district} className="transition hover:bg-zinc-800/40">
                  <td className="px-4 py-2.5 text-zinc-200">{d.district}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{d.avg_price_sqm.toLocaleString()}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{d.transaction_count}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{d.infrastructure_score}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn("font-mono", d.gap_score >= 60 ? "text-red-400" : d.gap_score >= 40 ? "text-amber-400" : "text-zinc-400")}>
                      {d.gap_score}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-300">{d.active}</td>
                  <td className="px-4 py-2.5 capitalize text-zinc-500">{d.profile}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investor leaderboard */}
      <div className="card overflow-hidden">
        <h3 className="px-5 pt-5 text-sm font-semibold text-zinc-200">Investor Leaderboard</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-y border-line text-left text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Capital</th>
                <th className="px-4 py-3">Risk</th>
                <th className="px-4 py-3 w-40">Relationship</th>
                <th className="px-4 py-3">Deals</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {leaderboard.map((inv, i) => (
                <tr key={inv.investor_id} className="hover:bg-zinc-800/40">
                  <td className="px-4 py-2.5 font-mono text-zinc-500">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <Badge className={investorTypeBadge(inv.investor_type)}>{investorTypeLabel(inv.investor_type)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{inv.capital_range_aed}</td>
                  <td className="px-4 py-2.5 capitalize text-zinc-400">{inv.risk_profile}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={inv.relationship_score} height="h-1.5" />
                      <span className="font-mono text-xs text-zinc-300">{inv.relationship_score}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-400">{inv.deals_closed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
