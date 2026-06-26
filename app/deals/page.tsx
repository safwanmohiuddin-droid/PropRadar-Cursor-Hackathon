"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import DealCard from "@/components/deals/DealCard";
import EmptyState from "@/components/ui/EmptyState";
import { StaggerGrid, StaggerItem } from "@/components/ui/Motion";
import { cn } from "@/lib/ui";

const CATEGORIES: { id: string; label: string; types: string[] }[] = [
  { id: "all", label: "All", types: [] },
  { id: "residential", label: "Residential", types: ["villa", "apartment", "townhouse", "penthouse"] },
  { id: "commercial", label: "Commercial", types: ["commercial", "office", "retail"] },
  { id: "industrial", label: "Industrial", types: ["warehouse", "plot", "land"] },
];

const SORTS = [
  { id: "distress", label: "Distress score" },
  { id: "newest", label: "Newest" },
  { id: "discount", label: "Discount %" },
  { id: "urgency", label: "Urgency" },
];

export default function DealsPage() {
  const deals = useStore((s) => s.deals);
  const districts = useStore((s) => s.districts);

  const [cat, setCat] = useState("all");
  const [completion, setCompletion] = useState("all");
  const [district, setDistrict] = useState("all");
  const [minDistress, setMinDistress] = useState(0);
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [sort, setSort] = useState("distress");

  const filtered = useMemo(() => {
    let list = [...deals];
    const c = CATEGORIES.find((x) => x.id === cat);
    if (c && c.types.length) list = list.filter((d) => c.types.includes(d.asset_type));
    if (completion !== "all") list = list.filter((d) => d.completion_status === completion);
    if (district !== "all") list = list.filter((d) => d.district === district);
    if (minDistress > 0) list = list.filter((d) => d.distress_score >= minDistress);
    if (urgentOnly) list = list.filter((d) => d.urgency_days <= 21);

    list.sort((a, b) => {
      if (sort === "newest") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sort === "discount") return b.discount_pct - a.discount_pct;
      if (sort === "urgency") return a.urgency_days - b.urgency_days;
      return b.distress_score - a.distress_score;
    });
    return list;
  }, [deals, cat, completion, district, minDistress, urgentOnly, sort]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-zinc-50">
            Off-Plan Distress Marketplace <span className="font-mono text-sm text-zinc-500">({filtered.length})</span>
          </h1>
          <p className="text-sm text-zinc-500">
            Public marketplace · open to everyone · AI-scored against 5,000 Abu Dhabi transactions.
          </p>
        </div>
        <select value={sort} onChange={(e) => setSort(e.target.value)} className="input w-auto">
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              Sort: {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filters */}
      <div className="card space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                cat === c.id
                  ? "border-indigo-500 bg-indigo-600/15 text-indigo-300"
                  : "border-line text-zinc-400 hover:border-zinc-600",
              )}
            >
              {c.label}
            </button>
          ))}
          <span className="mx-1 h-4 w-px bg-line" />
          {[
            { id: "all", label: "All" },
            { id: "off_plan", label: "Off-plan" },
            { id: "ready", label: "Ready" },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setCompletion(c.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                completion === c.id
                  ? "border-amber-500 bg-amber-600/15 text-amber-300"
                  : "border-line text-zinc-400 hover:border-zinc-600",
              )}
            >
              {c.label}
            </button>
          ))}
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <select value={district} onChange={(e) => setDistrict(e.target.value)} className="input w-auto">
              <option value="all">All districts</option>
              {districts.map((d) => (
                <option key={d.district} value={d.district}>
                  {d.district}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              Distress ≥ <span className="font-mono text-zinc-200">{minDistress}</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={minDistress}
                onChange={(e) => setMinDistress(Number(e.target.value))}
                className="accent-indigo-500"
              />
            </label>
            <button
              onClick={() => setUrgentOnly((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition",
                urgentOnly ? "border-red-500/60 bg-red-600/15 text-red-300" : "border-line text-zinc-400",
              )}
            >
              ⏱ Urgent only
            </button>
          </div>
        </div>
      </div>

      {filtered.length ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => (
            <StaggerItem key={d.id}>
              <DealCard deal={d} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      ) : (
        <EmptyState icon="🔍" title="No deals match your filters" description="Try widening your filters or clearing the urgency toggle." />
      )}
    </div>
  );
}
