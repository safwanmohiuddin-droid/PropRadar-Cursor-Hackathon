"use client";

import { useMemo, useState } from "react";
import { useStore } from "@/lib/store";
import InvestorCard from "@/components/investors/InvestorCard";
import EmptyState from "@/components/ui/EmptyState";
import { StaggerGrid, StaggerItem } from "@/components/ui/Motion";
import { investorTypeLabel, cn } from "@/lib/ui";

export default function InvestorsPage() {
  const investors = useStore((s) => s.investors);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [sector, setSector] = useState("all");
  const [risk, setRisk] = useState("all");

  const types = useMemo(() => Array.from(new Set(investors.map((i) => i.investor_type))), [investors]);
  const sectors = useMemo(() => Array.from(new Set(investors.map((i) => i.preferred_sector))), [investors]);

  const filtered = useMemo(() => {
    return investors
      .filter((i) => (type === "all" ? true : i.investor_type === type))
      .filter((i) => (sector === "all" ? true : i.preferred_sector === sector))
      .filter((i) => (risk === "all" ? true : i.risk_profile === risk))
      .filter((i) =>
        q
          ? i.investor_id.toLowerCase().includes(q.toLowerCase()) ||
            i.investor_type.toLowerCase().includes(q.toLowerCase())
          : true,
      )
      .sort((a, b) => b.relationship_score - a.relationship_score);
  }, [investors, type, sector, risk, q]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-zinc-50">
          Investor Directory <span className="font-mono text-sm text-zinc-500">({filtered.length})</span>
        </h1>
        <p className="text-sm text-zinc-500">200 active investor mandates, ranked by relationship score.</p>
      </div>

      <div className="card flex flex-wrap items-center gap-3 p-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by ID or type…"
          className="input w-auto flex-1 min-w-[180px]"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className="input w-auto">
          <option value="all">All types</option>
          {types.map((t) => (
            <option key={t} value={t}>
              {investorTypeLabel(t)}
            </option>
          ))}
        </select>
        <select value={sector} onChange={(e) => setSector(e.target.value)} className="input w-auto">
          <option value="all">All sectors</option>
          {sectors.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {["all", "conservative", "balanced", "aggressive"].map((r) => (
            <button
              key={r}
              onClick={() => setRisk(r)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs capitalize transition",
                risk === r ? "border-indigo-500 bg-indigo-600/15 text-indigo-300" : "border-line text-zinc-400",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {filtered.length ? (
        <StaggerGrid className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.slice(0, 60).map((i) => (
            <StaggerItem key={i.investor_id}>
              <InvestorCard investor={i} />
            </StaggerItem>
          ))}
        </StaggerGrid>
      ) : (
        <EmptyState icon="💼" title="No investors match" description="Adjust your filters to see more mandates." />
      )}
    </div>
  );
}
